#!/usr/bin/env python3
"""
MIDI Data Collector & Generator
Generates training MIDI data for different genres (Classical, Jazz, Blues, Pop, Electronic)
Uses music21 to create stylistically appropriate musical patterns
"""

import sys
import json
import os
import random
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from music21 import stream, note, chord, tempo, key, meter, instrument as m21instrument

DATA_DIR = Path(__file__).parent.parent / "data" / "midi"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Musical scales and patterns for each genre
SCALES = {
    "C_major": [60, 62, 64, 65, 67, 69, 71, 72],
    "C_minor": [60, 62, 63, 65, 67, 68, 70, 72],
    "C_pentatonic": [60, 62, 64, 67, 69, 72],
    "C_blues": [60, 63, 65, 66, 67, 70, 72],
    "C_dorian": [60, 62, 63, 65, 67, 69, 70, 72],
    "C_mixolydian": [60, 62, 64, 65, 67, 69, 70, 72],
}

# Chord progressions by genre
CHORD_PROGRESSIONS = {
    "classical": [
        [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]],  # I-IV-V-I
        [[0, 4, 7], [2, 5, 9], [5, 9, 12], [0, 4, 7]],    # I-ii-IV-I
        [[0, 4, 7], [5, 9, 12], [7, 11, 14], [3, 7, 10]],  # I-IV-V-vi
        [[0, 4, 7], [-5, -1, 2], [5, 9, 12], [0, 4, 7]],   # I-vi-IV-I
    ],
    "jazz": [
        [[0, 4, 7, 11], [2, 5, 9, 12], [5, 9, 12, 16], [7, 11, 14, 17]],  # Maj7-ii7-IV7-V7
        [[0, 4, 7, 10], [3, 7, 10, 14], [5, 9, 12, 15], [0, 4, 7, 10]],   # i7-iv7-V7-i7
        [[0, 4, 7, 11], [-5, -1, 2, 5], [2, 5, 9, 12], [5, 9, 12, 16]],   # Maj7-vi7-ii7-V7
        [[0, 4, 7, 10], [5, 9, 12, 15], [7, 11, 14, 17], [0, 4, 7, 10]],  # i7-IV7-V7-i7
    ],
    "blues": [
        [[0, 4, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7],      # I
         [5, 9, 12], [5, 9, 12], [0, 4, 7], [0, 4, 7],      # IV-I
         [7, 11, 14], [5, 9, 12], [0, 4, 7], [7, 11, 14]],   # V-IV-I-V
    ],
    "pop": [
        [[0, 4, 7], [5, 9, 12], [7, 11, 14], [3, 7, 10]],  # I-V-vi-IV
        [[0, 4, 7], [3, 7, 10], [5, 9, 12], [7, 11, 14]],   # I-vi-IV-V
        [[0, 4, 7], [7, 11, 14], [3, 7, 10], [5, 9, 12]],   # I-V-vi-IV (variant)
    ],
    "electronic": [
        [[0, 7], [0, 7], [5, 12], [5, 12]],                  # Power chords
        [[0, 3, 7], [5, 8, 12], [7, 10, 14], [3, 7, 10]],   # Minor triads
        [[0, 7], [3, 10], [5, 12], [7, 14]],                 # Power chord movement
    ],
}

# Note patterns by genre
MELODY_PATTERNS = {
    "classical": {
        "scales": ["C_major", "C_major", "C_minor"],
        "note_durations": [0.25, 0.5, 0.5, 1.0, 1.0, 2.0],
        "rest_probability": 0.1,
        "octave_range": (4, 6),
        "step_bias": 0.7,  # Probability of stepwise motion
    },
    "jazz": {
        "scales": ["C_dorian", "C_mixolydian", "C_blues"],
        "note_durations": [0.25, 0.5, 0.5, 1.0, 1.5],
        "rest_probability": 0.15,
        "octave_range": (4, 6),
        "step_bias": 0.5,  # More leaps in jazz
    },
    "blues": {
        "scales": ["C_blues", "C_blues", "C_minor"],
        "note_durations": [0.5, 0.5, 1.0, 1.0, 1.5, 2.0],
        "rest_probability": 0.15,
        "octave_range": (3, 5),
        "step_bias": 0.6,
    },
    "pop": {
        "scales": ["C_major", "C_pentatonic", "C_major"],
        "note_durations": [0.25, 0.5, 0.5, 1.0, 1.0],
        "rest_probability": 0.1,
        "octave_range": (4, 5),
        "step_bias": 0.65,
    },
    "electronic": {
        "scales": ["C_minor", "C_pentatonic", "C_minor"],
        "note_durations": [0.125, 0.25, 0.25, 0.5, 0.5],
        "rest_probability": 0.2,
        "octave_range": (3, 6),
        "step_bias": 0.4,
    },
}


def get_scale_notes(scale_name, base_octave=4):
    """Get MIDI notes for a scale in the given octave"""
    pattern = SCALES[scale_name]
    octave_offset = (base_octave - 4) * 12
    return [n + octave_offset for n in pattern]


def generate_melody(genre, num_notes=32):
    """Generate a melody for the given genre"""
    pattern = MELODY_PATTERNS[genre]
    scale_name = random.choice(pattern["scales"])
    scale_notes = get_scale_notes(scale_name, random.randint(*pattern["octave_range"]))

    # Extend scale across octaves
    all_notes = list(scale_notes)
    for oct_shift in [-12, 12, 24]:
        all_notes.extend([n + oct_shift for n in scale_notes])
    all_notes = sorted(set(all_notes))

    melody = []
    current_idx = len(scale_notes) // 2  # Start in middle

    for _ in range(num_notes):
        if random.random() < pattern["rest_probability"]:
            melody.append(None)  # Rest
        else:
            # Stepwise motion vs leap
            if random.random() < pattern["step_bias"]:
                step = random.choice([-1, 0, 1, 1])  # Slight upward bias
                current_idx = max(0, min(len(all_notes) - 1, current_idx + step))
            else:
                leap = random.choice([-2, -1, 2, 3])
                current_idx = max(0, min(len(all_notes) - 1, current_idx + leap))

            midi_note = all_notes[current_idx]
            duration = random.choice(pattern["note_durations"])
            velocity = random.randint(60, 100)
            melody.append({"pitch": midi_note, "duration": duration, "velocity": velocity})

    return melody


def generate_accompaniment(genre, num_measures=8):
    """Generate chord accompaniment for the genre"""
    progressions = CHORD_PROGRESSIONS[genre]
    progression = random.choice(progressions)

    chords_list = []
    base_pitch = 48  # C3

    for measure in range(num_measures):
        chord_pitches = progression[measure % len(progression)]
        chord_midi = [base_pitch + p for p in chord_pitches]
        duration = 4.0  # Whole note
        velocity = random.randint(50, 70)
        chords_list.append({
            "pitches": chord_midi,
            "duration": duration,
            "velocity": velocity,
        })

    return chords_list


def create_midi_stream(genre, melody_data, accompaniment_data=None):
    """Create a music21 Stream from generated data"""
    s = stream.Stream()

    # Set tempo
    tempo_map = {
        "classical": random.randint(80, 120),
        "jazz": random.randint(100, 140),
        "blues": random.randint(60, 100),
        "pop": random.randint(100, 130),
        "electronic": random.randint(120, 140),
    }
    bpm = tempo_map.get(genre, 120)
    s.append(tempo.MetronomeMark(number=bpm))
    s.append(meter.TimeSignature("4/4"))
    s.append(key.KeySignature(0))

    # Set instrument
    instr_map = {
        "classical": m21instrument.Piano(),
        "jazz": m21instrument.Saxophone(),
        "blues": m21instrument.Guitar(),
        "pop": m21instrument.Piano(),
        "electronic": m21instrument.ElectricOrgan(),
    }
    s.append(instr_map.get(genre, m21instrument.Piano()))

    # Add melody notes
    melody_part = stream.Part()
    for item in melody_data:
        if item is None:
            melody_part.append(note.Rest(quarterLength=0.5))
        else:
            n = note.Note(midi=item["pitch"], quarterLength=item["duration"])
            n.volume.velocity = item["velocity"]
            melody_part.append(n)
    s.append(melody_part)

    # Add accompaniment
    if accompaniment_data:
        accomp_part = stream.Part()
        for chord_data in accompaniment_data:
            c = chord.Chord(chord_data["pitches"], quarterLength=chord_data["duration"])
            c.volume.velocity = chord_data["velocity"]
            accomp_part.append(c)
        s.append(accomp_part)

    return s


def generate_dataset(genre, count=50):
    """Generate a dataset of MIDI files for training"""
    genre_dir = DATA_DIR / genre
    genre_dir.mkdir(parents=True, exist_ok=True)

    generated = []
    for i in range(count):
        num_notes = random.randint(16, 64)
        melody = generate_melody(genre, num_notes)
        accompaniment = generate_accompaniment(genre, num_notes // 4)

        midi_stream = create_midi_stream(genre, melody, accompaniment)

        filename = f"{genre}_{i+1:03d}.mid"
        filepath = genre_dir / filename
        midi_stream.write("midi", fp=str(filepath))

        generated.append({
            "filename": filename,
            "notes": num_notes,
            "genre": genre,
        })

    return generated


def get_dataset_info():
    """Get info about existing dataset"""
    info = {"files": 0, "genres": []}
    for genre_dir in DATA_DIR.iterdir():
        if genre_dir.is_dir():
            files = list(genre_dir.glob("*.mid"))
            if files:
                info["genres"].append({
                    "name": genre_dir.name,
                    "count": len(files),
                })
                info["files"] += len(files)
    return info


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "info":
        info = get_dataset_info()
        print(json.dumps(info))
    else:
        genre = sys.argv[1] if len(sys.argv) > 1 else "classical"
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 50
        result = generate_dataset(genre, count)
        print(json.dumps({
            "genre": genre,
            "count": len(result),
            "files": result[:5],  # Show first 5
            "message": f"Generated {len(result)} MIDI files for {genre} genre"
        }))
