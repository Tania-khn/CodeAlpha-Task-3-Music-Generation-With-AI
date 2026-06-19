#!/usr/bin/env python3
"""
Quick Music Generator - Algorithmic generation that doesn't require a trained model.
Uses music theory rules and probabilistic models to generate music instantly.
This allows users to hear generated music immediately while the LSTM model trains.
"""

import sys
import json
import os
import random
import math
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from music21 import stream, note, chord, tempo as m21tempo, key, meter, instrument as m21instrument

GENERATED_DIR = Path(__file__).parent.parent / "data" / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

# Musical scales - base intervals from C, then we transpose for any key
BASE_SCALES = {
    "major": [0, 2, 4, 5, 7, 9, 11],
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "pentatonic": [0, 2, 4, 7, 9],
    "blues": [0, 3, 5, 6, 7, 10],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
}

# Map note names to semitone offset from C
KEY_OFFSETS = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
    "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
}

# Musical scales (MIDI note numbers relative to C4=60)
SCALES = {
    "C": {
        "major": [0, 2, 4, 5, 7, 9, 11],
        "minor": [0, 2, 3, 5, 7, 8, 10],
        "pentatonic": [0, 2, 4, 7, 9],
        "blues": [0, 3, 5, 6, 7, 10],
        "dorian": [0, 2, 3, 5, 7, 9, 10],
        "mixolydian": [0, 2, 4, 5, 7, 9, 10],
    },
    "D": {
        "major": [2, 4, 6, 7, 9, 11, 13],
        "minor": [2, 4, 5, 7, 9, 10, 12],
    },
    "E": {
        "major": [4, 6, 8, 9, 11, 13, 15],
        "minor": [4, 6, 7, 9, 11, 12, 14],
    },
    "F": {
        "major": [5, 7, 9, 10, 12, 14, 16],
        "minor": [5, 7, 8, 10, 12, 13, 15],
    },
    "G": {
        "major": [7, 9, 11, 12, 14, 16, 18],
        "minor": [7, 9, 10, 12, 14, 15, 17],
    },
    "A": {
        "major": [9, 11, 13, 14, 16, 18, 20],
        "minor": [9, 11, 12, 14, 16, 17, 19],
    },
    "Bb": {
        "major": [10, 12, 14, 15, 17, 19, 22],
        "minor": [10, 12, 13, 15, 17, 18, 21],
    },
    "C#": {
        "major": [1, 3, 5, 6, 8, 10, 13],
        "minor": [1, 3, 4, 6, 8, 9, 12],
    },
}

# Genre configurations
GENRE_CONFIG = {
    "classical": {
        "scale_type": "major",
        "tempo_range": (80, 120),
        "note_durations": [0.25, 0.5, 0.5, 1.0, 1.0, 2.0],
        "rest_chance": 0.08,
        "step_chance": 0.75,
        "leap_range": (-3, 3),
        "velocity_range": (55, 95),
        "base_octave": 5,
        "phrase_length": (8, 16),
        "repeat_chance": 0.3,
        "chord_progression": [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]],
    },
    "jazz": {
        "scale_type": "dorian",
        "tempo_range": (100, 140),
        "note_durations": [0.25, 0.5, 0.75, 1.0, 1.5],
        "rest_chance": 0.15,
        "step_chance": 0.5,
        "leap_range": (-5, 5),
        "velocity_range": (50, 100),
        "base_octave": 5,
        "phrase_length": (6, 12),
        "repeat_chance": 0.15,
        "chord_progression": [[0, 4, 7, 11], [2, 5, 9, 12], [5, 9, 12, 16], [7, 11, 14, 17]],
    },
    "blues": {
        "scale_type": "blues",
        "tempo_range": (60, 100),
        "note_durations": [0.5, 0.75, 1.0, 1.0, 1.5, 2.0],
        "rest_chance": 0.12,
        "step_chance": 0.6,
        "leap_range": (-4, 4),
        "velocity_range": (60, 100),
        "base_octave": 4,
        "phrase_length": (6, 12),
        "repeat_chance": 0.35,
        "chord_progression": [[0, 4, 7], [0, 4, 7], [5, 9, 12], [0, 4, 7], [7, 11, 14], [0, 4, 7]],
    },
    "pop": {
        "scale_type": "pentatonic",
        "tempo_range": (100, 130),
        "note_durations": [0.25, 0.5, 0.5, 1.0, 1.0],
        "rest_chance": 0.1,
        "step_chance": 0.7,
        "leap_range": (-3, 3),
        "velocity_range": (60, 95),
        "base_octave": 5,
        "phrase_length": (8, 16),
        "repeat_chance": 0.4,
        "chord_progression": [[0, 4, 7], [5, 9, 12], [7, 11, 14], [3, 7, 10]],
    },
    "electronic": {
        "scale_type": "minor",
        "tempo_range": (120, 140),
        "note_durations": [0.125, 0.25, 0.25, 0.5, 0.5, 1.0],
        "rest_chance": 0.2,
        "step_chance": 0.4,
        "leap_range": (-6, 6),
        "velocity_range": (70, 110),
        "base_octave": 4,
        "phrase_length": (4, 8),
        "repeat_chance": 0.5,
        "chord_progression": [[0, 7], [3, 10], [5, 12], [7, 14]],
    },
}


def get_scale_notes(key_name, scale_type, base_octave=5):
    """Get scale notes for a key and scale type. Supports all keys including sharps/flats."""
    # First try direct lookup in SCALES dict
    if key_name in SCALES:
        key_scales = SCALES[key_name]
        scale = key_scales.get(scale_type, key_scales.get("major", BASE_SCALES["major"]))
    else:
        # Compute scale by transposing base scale to the key
        offset = KEY_OFFSETS.get(key_name, 0)
        base_intervals = BASE_SCALES.get(scale_type, BASE_SCALES["major"])
        scale = [interval + offset for interval in base_intervals]

    notes = []
    for octave in range(base_octave - 1, base_octave + 3):
        base = 12 * (octave + 1)  # MIDI note for C in this octave
        for interval in scale:
            notes.append(base + interval)

    return sorted(set(notes))


def generate_phrase(scale_notes, config, temperature=1.0, length=16):
    """Generate a musical phrase"""
    phrase = []
    current_idx = len(scale_notes) // 2  # Start in middle of range

    for _ in range(length):
        if random.random() < config["rest_chance"]:
            phrase.append(None)
            continue

        # Determine next note
        if random.random() < config["step_chance"]:
            # Stepwise motion
            step = random.choice([-1, 0, 1, 1])  # Slight upward bias
        else:
            # Leap
            leap = random.randint(config["leap_range"][0], config["leap_range"][1])
            step = leap

        current_idx = max(0, min(len(scale_notes) - 1, current_idx + step))

        pitch = scale_notes[current_idx]
        duration = random.choice(config["note_durations"])

        # Temperature affects duration variety
        if temperature > 1.0:
            duration = duration * random.uniform(0.5, 1.5)
        elif temperature < 0.5:
            duration = random.choice(config["note_durations"][:3])  # Shorter notes

        velocity = random.randint(*config["velocity_range"])

        phrase.append({
            "pitch": pitch,
            "duration": round(duration, 3),
            "velocity": velocity,
        })

    return phrase


def generate_music(genre, length=64, tempo=120, key_name="C", instrument_name="piano", temperature=1.0):
    """Generate a complete piece of music"""
    config = GENRE_CONFIG.get(genre, GENRE_CONFIG["classical"])

    # Get scale
    scale_notes = get_scale_notes(key_name, config["scale_type"], config["base_octave"])

    # Determine tempo
    if tempo <= 0:
        tempo = random.randint(*config["tempo_range"])

    # Generate phrases
    all_notes = []
    current_time = 0
    phrase_len_range = config["phrase_length"]
    notes_generated = 0

    while notes_generated < length:
        phrase_length = random.randint(*phrase_len_range)
        phrase_length = min(phrase_length, length - notes_generated)
        phrase = generate_phrase(scale_notes, config, temperature, phrase_length)

        # Repeat phrase?
        if random.random() < config["repeat_chance"] and notes_generated + phrase_length * 2 <= length:
            phrase = phrase + phrase  # Repeat the phrase

        for item in phrase:
            if item is None:
                current_time += 0.5  # Rest duration
                continue

            all_notes.append({
                "pitch": item["pitch"],
                "duration": item["duration"],
                "velocity": item["velocity"],
                "time": round(current_time, 3),
            })
            current_time += item["duration"]
            notes_generated += 1

            if notes_generated >= length:
                break

    # Add bass/chord accompaniment
    accomp_notes = []
    chord_prog = config["chord_progression"]
    measure_duration = 4.0  # 4 beats per measure

    for measure in range(int(current_time / measure_duration) + 1):
        chord_pitches = chord_prog[measure % len(chord_prog)]
        base = 48  # C3
        for pitch_offset in chord_pitches:
            accomp_notes.append({
                "pitch": base + pitch_offset,
                "duration": measure_duration,
                "velocity": random.randint(40, 60),
                "time": round(measure * measure_duration, 3),
            })

    # Create MIDI file
    midi_stream = stream.Stream()
    midi_stream.append(m21tempo.MetronomeMark(number=tempo))
    midi_stream.append(meter.TimeSignature("4/4"))

    instr_map = {
        "piano": m21instrument.Piano(),
        "saxophone": m21instrument.Saxophone(),
        "guitar": m21instrument.Guitar(),
        "violin": m21instrument.Violin(),
        "synth": m21instrument.ElectricOrgan(),
    }

    # Melody part
    melody_part = stream.Part()
    melody_part.append(instr_map.get(instrument_name, m21instrument.Piano()))
    for n_data in all_notes:
        n = note.Note(midi=n_data["pitch"], quarterLength=n_data["duration"])
        n.volume.velocity = n_data["velocity"]
        melody_part.append(n)

    # Accompaniment part
    accomp_part = stream.Part()
    accomp_part.append(m21instrument.Piano())
    for a_data in accomp_notes:
        n = note.Note(midi=a_data["pitch"], quarterLength=min(a_data["duration"], 4.0))
        n.volume.velocity = a_data["velocity"]
        accomp_part.append(n)

    midi_stream.append(melody_part)
    midi_stream.append(accomp_part)

    # Save MIDI
    midi_filename = f"{genre}_quick_{random.randint(1000, 9999)}.mid"
    midi_path = GENERATED_DIR / midi_filename
    midi_stream.write("midi", fp=str(midi_path))

    # Calculate statistics
    pitches = [n["pitch"] for n in all_notes]
    duration_counts = {}
    for n in all_notes:
        d = n["duration"]
        duration_counts[str(d)] = duration_counts.get(str(d), 0) + 1

    return {
        "genre": genre,
        "notes": all_notes,
        "accompaniment": accomp_notes,
        "total_notes": len(all_notes),
        "tempo": tempo,
        "key": key_name,
        "instrument": instrument_name,
        "temperature": temperature,
        "midi_file": midi_filename,
        "model_type": "Algorithmic",
        "statistics": {
            "pitch_range": f"{min(pitches)} - {max(pitches)}" if pitches else "N/A",
            "duration_distribution": duration_counts,
            "total_duration_beats": round(current_time, 2),
        },
    }


if __name__ == "__main__":
    genre = sys.argv[1] if len(sys.argv) > 1 else "classical"
    length = int(sys.argv[2]) if len(sys.argv) > 2 else 64
    tempo = int(sys.argv[3]) if len(sys.argv) > 3 else 120
    key_name = sys.argv[4] if len(sys.argv) > 4 else "C"
    instrument_name = sys.argv[5] if len(sys.argv) > 5 else "piano"
    temperature = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0

    result = generate_music(genre, length, tempo, key_name, instrument_name, temperature)
    print(json.dumps(result))
