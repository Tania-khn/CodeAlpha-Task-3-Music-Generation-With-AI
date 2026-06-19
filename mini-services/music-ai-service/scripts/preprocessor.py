#!/usr/bin/env python3
"""
MIDI Preprocessor
Parses MIDI files and converts them into note sequences suitable for LSTM training.
Uses music21 for robust MIDI parsing.
"""

import sys
import json
import os
import pickle
from pathlib import Path
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent))

from music21 import converter, note, chord, instrument

DATA_DIR = Path(__file__).parent.parent / "data" / "midi"
PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def extract_notes_from_midi(midi_path):
    """Extract note events from a MIDI file using music21"""
    try:
        midi = converter.parse(midi_path)
    except Exception as e:
        print(f"Error parsing {midi_path}: {e}", file=sys.stderr)
        return None

    notes = []
    offsets = []

    # Parse all notes and chords
    for element in midi.flatten().notes:
        if isinstance(element, note.Note):
            notes.append({
                "pitch": element.pitch.midi,
                "duration": float(element.quarterLength),
                "offset": float(element.offset),
                "velocity": int(element.volume.velocity) if element.volume.velocity else 80,
            })
            offsets.append(float(element.offset))
        elif isinstance(element, chord.Chord):
            # Use the root note of the chord
            root = element.root()
            notes.append({
                "pitch": root.midi,
                "duration": float(element.quarterLength),
                "offset": float(element.offset),
                "velocity": int(element.volume.velocity) if element.volume.velocity else 70,
            })
            # Also add chord info
            chord_pitches = [p.midi for p in element.pitches]
            notes.append({
                "pitch": chord_pitches,  # List of pitches for chords
                "duration": float(element.quarterLength),
                "offset": float(element.offset),
                "velocity": int(element.volume.velocity) if element.volume.velocity else 70,
                "is_chord": True,
            })
            offsets.append(float(element.offset))

    # Sort by offset time
    notes.sort(key=lambda x: x["offset"])
    return notes


def create_note_sequences(notes, sequence_length=32):
    """Create input/output sequences for training the LSTM"""
    # Extract just pitch values for sequence creation
    pitch_sequence = []
    for n in notes:
        if isinstance(n.get("pitch"), list):
            # For chords, use the average pitch
            pitch_sequence.append(sum(n["pitch"]) // len(n["pitch"]))
        else:
            pitch_sequence.append(n["pitch"])

    if len(pitch_sequence) < sequence_length + 1:
        return None

    # Create sequences
    sequences = []
    for i in range(len(pitch_sequence) - sequence_length):
        input_seq = pitch_sequence[i:i + sequence_length]
        output_seq = pitch_sequence[i + sequence_length]
        sequences.append({
            "input": input_seq,
            "output": output_seq,
        })

    return sequences


def create_full_sequences(notes, sequence_length=32):
    """Create full note sequences including duration and velocity"""
    if len(notes) < sequence_length + 1:
        return None

    sequences = []
    for i in range(len(notes) - sequence_length):
        input_notes = notes[i:i + sequence_length]
        output_note = notes[i + sequence_length]

        # Simplify notes for sequence
        input_seq = []
        for n in input_notes:
            pitch = n["pitch"] if isinstance(n.get("pitch"), int) else 60
            input_seq.append({
                "pitch": pitch,
                "duration": n["duration"],
            })

        out_pitch = output_note["pitch"] if isinstance(output_note.get("pitch"), int) else 60
        output_seq = {
            "pitch": out_pitch,
            "duration": output_note["duration"],
        }

        sequences.append({
            "input": input_seq,
            "output": output_seq,
        })

    return sequences


def preprocess_genre(genre, sequence_length=32):
    """Preprocess all MIDI files for a genre. Auto-collects data if none exists."""
    genre_dir = DATA_DIR / genre
    if not genre_dir.exists() or not list(genre_dir.glob("*.mid")):
        # Auto-collect data if none exists
        print(f"No MIDI data for {genre}, auto-collecting...", file=sys.stderr)
        from data_collector import generate_dataset
        result = generate_dataset(genre, 50)
        print(f"Auto-collected {len(result)} MIDI files for {genre}", file=sys.stderr)

    if not genre_dir.exists():
        return {"error": f"Failed to create data for genre: {genre}"}

    midi_files = list(genre_dir.glob("*.mid"))
    if not midi_files:
        return {"error": f"No MIDI files found for genre: {genre}"}

    all_notes = []
    all_sequences = []
    parsed = 0
    errors = 0

    for midi_file in midi_files:
        notes = extract_notes_from_midi(str(midi_file))
        if notes is None:
            errors += 1
            continue

        all_notes.extend(notes)
        sequences = create_note_sequences(notes, sequence_length)
        if sequences:
            all_sequences.extend(sequences)
        parsed += 1

    if not all_notes:
        return {"error": "No valid notes extracted"}

    # Build pitch vocabulary
    pitch_values = sorted(set(
        n["pitch"] for n in all_notes if isinstance(n.get("pitch"), int)
    ))

    # Create pitch to int mapping
    pitch_to_int = {p: i for i, p in enumerate(pitch_values)}
    int_to_pitch = {i: p for i, p in enumerate(pitch_values)}

    # Save processed data
    processed_data = {
        "notes": all_notes,
        "sequences": all_sequences,
        "pitch_to_int": pitch_to_int,
        "int_to_pitch": int_to_pitch,
        "num_unique_pitches": len(pitch_values),
        "total_notes": len(all_notes),
        "total_sequences": len(all_sequences),
    }

    output_path = PROCESSED_DIR / f"{genre}_processed.pkl"
    with open(output_path, "wb") as f:
        pickle.dump(processed_data, f)

    return {
        "genre": genre,
        "files_parsed": parsed,
        "files_errors": errors,
        "total_notes": len(all_notes),
        "total_sequences": len(all_sequences),
        "unique_pitches": len(pitch_values),
        "pitch_range": f"{min(pitch_values)} - {max(pitch_values)}" if pitch_values else "N/A",
        "sequence_length": sequence_length,
        "saved_to": str(output_path),
    }


if __name__ == "__main__":
    genre = sys.argv[1] if len(sys.argv) > 1 else "classical"
    seq_length = int(sys.argv[2]) if len(sys.argv) > 2 else 32
    result = preprocess_genre(genre, seq_length)
    print(json.dumps(result))
