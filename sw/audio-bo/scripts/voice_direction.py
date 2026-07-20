from math import prod


SPEED = {
    'calm': 0.96,
    'firm': 1.00,
    'energetic': 1.04,
    'urgent': 1.08,
    'relaxed': 0.93,
    'gentle': 1.00,
    'clear': 1.00,
    'weighty': 0.96,
}

PAUSE = {
    'calm': 0.08,
    'energetic': -0.03,
    'urgent': -0.12,
    'relaxed': 0.16,
    'gentle': 0.04,
    'weighty': 0.06,
}


def build_direction_settings(values):
    selected = list(dict.fromkeys(value for value in values if value in SPEED))
    speed = min(1.10, max(0.92, prod(SPEED[value] for value in selected)))
    pause = min(0.60, max(0.12, 0.30 + sum(PAUSE.get(value, 0) for value in selected)))
    highpass = 90 if 'clear' in selected else 70
    lowpass = 12000 if 'gentle' in selected else 14500
    ratio = 3.2 if 'firm' in selected else 2.7 if 'energetic' in selected else 1.9 if 'gentle' in selected else 2.2
    target = -16 if 'energetic' in selected or 'firm' in selected else -18 if 'gentle' in selected else -17
    filters = [f'highpass=f={highpass}', f'lowpass=f={lowpass}']
    if 'clear' in selected:
        filters.append('treble=g=2:f=3500')
    if 'energetic' in selected:
        filters.append('treble=g=1.2:f=2800')
    if 'weighty' in selected:
        filters.append('bass=g=2.5:f=180')
    filters.extend([
        f'acompressor=threshold=-20dB:ratio={ratio}:attack=20:release=180:makeup=1.5',
        f'loudnorm=I={target}:TP=-1.5:LRA=6',
    ])
    return {
        'directions': selected,
        'speed_factor': round(speed, 3),
        'fragment_interval': round(pause, 3),
        'filter': ','.join(filters),
    }
