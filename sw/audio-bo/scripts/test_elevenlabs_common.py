import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from celeb_dialogue_voice_common import ELEVENLABS_TTS_DEFAULTS, speech_body, synthesize


class ElevenlabsCommonTests(unittest.TestCase):
    def test_supported_settings_and_older_model_override(self):
        self.assertEqual(ELEVENLABS_TTS_DEFAULTS['modelId'], 'eleven_v4')
        body = speech_body('hello', 'eleven_v4', 0, .75, .3, .9)
        self.assertEqual(body['voice_settings'], {'stability': 0, 'similarity_boost': .75, 'speed': .9})
        self.assertNotIn('speed', body)
        self.assertEqual(speech_body('hello', 'eleven_v3', .5, .75, .3, 1)['voice_settings']['style'], .3)

    def test_transport_stores_audio_and_provider_metadata(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = b'a' * 2048
        response.headers = {'request-id': 'request', 'history-item-id': 'history'}
        with tempfile.TemporaryDirectory() as folder, patch('urllib.request.urlopen', return_value=response) as call:
            destination = Path(folder) / 'sample.mp3'
            result = synthesize('test-key', 'voice/id', 'hello', destination, 'eleven_v4', .5, .75, .3, 1)
            request = call.call_args.args[0]
            self.assertIn('voice%2Fid?', request.full_url)
            self.assertEqual(json.loads(request.data)['model_id'], 'eleven_v4')
            self.assertEqual(destination.stat().st_size, 2048)
            self.assertEqual(result['requestId'], 'request')

    def test_invalid_audio_does_not_overwrite_destination(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = b''
        with tempfile.TemporaryDirectory() as folder, patch('urllib.request.urlopen', return_value=response):
            destination = Path(folder) / 'sample.mp3'
            destination.write_bytes(b'original')
            with self.assertRaisesRegex(RuntimeError, 'small audio'):
                synthesize('test-key', 'voice', 'hello', destination, 'eleven_v4', .5, .75, .3, 1)
            self.assertEqual(destination.read_bytes(), b'original')


if __name__ == '__main__':
    unittest.main()
