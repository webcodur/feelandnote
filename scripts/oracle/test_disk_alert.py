import importlib.util
import json
import os
from io import StringIO
from pathlib import Path
import smtplib
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, MagicMock, patch

spec = importlib.util.spec_from_file_location('alert', Path(__file__).with_name('disk-alert.py'))
alert = importlib.util.module_from_spec(spec)
spec.loader.exec_module(alert)


def disk(percent):
    return SimpleNamespace(total=100, used=percent, free=100-percent)


class DiskAlertTests(unittest.TestCase):
    def test_test_email_records_time_without_clearing_an_existing_warning(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            state = root / 'state.json'
            state.write_text('{"alerted": true, "lastSentAt": "2026-10-05T10:00:00Z"}')
            (root / 'disk-alert.json').write_text('{}')
            with patch.object(alert, 'STATE_PATH', state), \
                    patch.object(alert, 'send_email') as send, \
                    patch.object(alert.shutil, 'disk_usage', return_value=disk(20)), \
                    patch.dict(os.environ, {'CREDENTIALS_DIRECTORY': str(root)}), \
                    patch('sys.argv', ['disk-alert.py', '--test-email']), \
                    patch('sys.stdout', new_callable=StringIO):
                alert.main()
            saved = json.loads(state.read_text())
            self.assertTrue(saved['alerted'])
            self.assertEqual(saved['lastSentAt'], '2026-10-05T10:00:00Z')
            self.assertTrue(saved['lastTestSentAt'])
            send.assert_called_once()

    def test_existing_nodemailer_sender_object_is_converted_to_mailbox(self):
        client = MagicMock()
        client.send_message.return_value = {}
        config = {'mailFrom': {'name': 'Feel&Note', 'address': 'alerts@example.invalid'},
                  'to': 'operator@example.invalid', 'smtp': {'host': 'smtp.example.invalid',
                  'port': 587, 'secure': False, 'auth': {'user': 'user', 'pass': 'password'}}}
        with patch.object(alert.smtplib, 'SMTP', return_value=client):
            alert.send_email(config, disk(80))
        message = client.send_message.call_args.args[0]
        self.assertEqual(str(message['From']), 'Feel&Note <alerts@example.invalid>')
        client.starttls.assert_called_once()

    def test_threshold_deduplication_and_rearm(self):
        with tempfile.TemporaryDirectory() as tmp:
            state = Path(tmp) / 'state.json'
            send = Mock()
            self.assertEqual(alert.check({}, disk(79.9), state, send)['status'], 'below-threshold')
            send.assert_not_called()
            self.assertEqual(alert.check({}, disk(80), state, send)['status'], 'sent')
            first_sent = json.loads(state.read_text())['lastSentAt']
            self.assertEqual(alert.check({}, disk(99), state, send)['status'], 'already-alerted')
            self.assertEqual(alert.check({}, disk(75), state, send)['status'], 'already-alerted')
            self.assertEqual(send.call_count, 1)
            self.assertEqual(alert.check({}, disk(74.9), state, send)['status'], 'rearmed')
            self.assertEqual(json.loads(state.read_text())['lastSentAt'], first_sent)
            self.assertEqual(alert.check({}, disk(80), state, send)['status'], 'sent')
            self.assertEqual(send.call_count, 2)

    def test_smtp_failure_is_retried_and_never_marked_sent(self):
        with tempfile.TemporaryDirectory() as tmp:
            state = Path(tmp) / 'state.json'
            send = Mock(side_effect=[smtplib.SMTPException('rejected'), None])
            with self.assertRaises(smtplib.SMTPException):
                alert.check({}, disk(80), state, send)
            self.assertFalse(state.exists())
            self.assertEqual(alert.check({}, disk(80), state, send)['status'], 'sent')
            self.assertEqual(send.call_count, 2)
            self.assertTrue(json.loads(state.read_text())['alerted'])

    def test_reserved_disk_blocks_match_df(self):
        measured = SimpleNamespace(total=110, used=80, free=20)
        self.assertEqual(alert.usage_percent(measured), 80)

    def test_corrupt_state_fails_instead_of_silently_suppressing_alerts(self):
        with tempfile.TemporaryDirectory() as tmp:
            state = Path(tmp) / 'state.json'
            state.write_text('{"alerted": "false"}')
            with self.assertRaises(ValueError):
                alert.check({}, disk(80), state, Mock())


if __name__ == '__main__':
    unittest.main()
