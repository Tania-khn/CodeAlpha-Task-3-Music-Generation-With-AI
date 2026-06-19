#!/usr/bin/env python3
"""
Music Generator using trained LSTM model
Generates new music sequences from a trained model and outputs MIDI-compatible note data.
"""

import sys
import json
import os
import pickle
import random
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
import torch.nn as nn

DATA_DIR = Path(__file__).parent.parent / "data"
MODELS_DIR = DATA_DIR / "models"
GENERATED_DIR = DATA_DIR / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

from music21 import stream, note, chord, tempo, key, meter, instrument as m21instrument


class MusicLSTM(nn.Module):
    """LSTM model for music generation (same architecture as trainer)"""

    def __init__(self, vocab_size, embedding_dim=128, hidden_dim=256, num_layers=3, dropout=0.3):
        super(MusicLSTM, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(
            embedding_dim, hidden_dim,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0,
            batch_first=True,
        )
        self.fc = nn.Linear(hidden_dim, vocab_size)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x, hidden=None):
        embedded = self.embedding(x)
        lstm_out, hidden = self.lstm(embedded, hidden)
        out = self.dropout(lstm_out[:, -1, :])
        out = self.fc(out)
        return out, hidden


def generate_with_model(genre, length=100, temperature=1.0, instrument_name="piano",
                        key="C", tempo_bpm=120):
    """Generate music using the trained LSTM model"""
    model_path = MODELS_DIR / f"{genre}_lstm.pt"
    if not model_path.exists():
        return {"error": f"No trained model for {genre}. Train the model first."}

    # Load model checkpoint
    checkpoint = torch.load(str(model_path), map_location="cpu", weights_only=False)
    pitch_to_int = checkpoint["pitch_to_int"]
    int_to_pitch = checkpoint["int_to_pitch"]
    vocab_size = checkpoint["vocab_size"]
    seq_length = checkpoint.get("seq_length", 32)

    # Initialize model
    model = MusicLSTM(
        vocab_size=vocab_size,
        embedding_dim=checkpoint.get("embedding_dim", 128),
        hidden_dim=checkpoint.get("hidden_dim", 256),
        num_layers=checkpoint.get("num_layers", 3),
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # Start with a random seed sequence
    all_pitches = list(pitch_to_int.keys())
    seed = [random.choice(all_pitches) for _ in range(seq_length)]
    seed_indices = [pitch_to_int.get(p, 0) for p in seed]

    # Generate notes
    generated_pitches = list(seed)
    current_seq = torch.tensor([seed_indices], dtype=torch.long)
    hidden = None

    with torch.no_grad():
        for _ in range(length):
            output, hidden = model(current_seq, hidden)

            # Apply temperature
            output = output / max(temperature, 0.1)

            # Sample from distribution
            probabilities = torch.softmax(output, dim=-1)
            predicted_idx = torch.multinomial(probabilities, 1).item()

            predicted_pitch = int_to_pitch.get(predicted_idx, 60)
            generated_pitches.append(predicted_pitch)

            # Update sequence (sliding window)
            current_seq = torch.tensor([[predicted_idx]], dtype=torch.long)

    # Convert to note data for frontend
    notes_data = []
    durations = [0.25, 0.5, 0.5, 1.0, 1.0, 0.5]
    for i, pitch in enumerate(generated_pitches[seq_length:]):  # Skip seed
        duration = random.choice(durations)
        velocity = random.randint(60, 100)
        notes_data.append({
            "pitch": pitch,
            "duration": duration,
            "velocity": velocity,
            "time": sum(n["duration"] for n in notes_data) if notes_data else 0,
        })

    # Create MIDI file
    midi_stream = stream.Stream()
    midi_stream.append(tempo.MetronomeMark(number=tempo_bpm))
    midi_stream.append(meter.TimeSignature("4/4"))

    instr_map = {
        "piano": m21instrument.Piano(),
        "saxophone": m21instrument.Saxophone(),
        "guitar": m21instrument.Guitar(),
        "violin": m21instrument.Violin(),
        "synth": m21instrument.ElectricOrgan(),
    }
    midi_stream.append(instr_map.get(instrument_name, m21instrument.Piano()))

    for n_data in notes_data:
        n = note.Note(midi=n_data["pitch"], quarterLength=n_data["duration"])
        n.volume.velocity = n_data["velocity"]
        midi_stream.append(n)

    # Save MIDI
    midi_filename = f"{genre}_generated_{random.randint(1000, 9999)}.mid"
    midi_path = GENERATED_DIR / midi_filename
    midi_stream.write("midi", fp=str(midi_path))

    return {
        "genre": genre,
        "notes": notes_data,
        "total_notes": len(notes_data),
        "tempo": tempo_bpm,
        "key": key,
        "instrument": instrument_name,
        "midi_file": midi_filename,
        "model_type": "LSTM",
        "temperature": temperature,
    }


if __name__ == "__main__":
    genre = sys.argv[1] if len(sys.argv) > 1 else "classical"
    length = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    temperature = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    instrument_name = sys.argv[4] if len(sys.argv) > 4 else "piano"
    key = sys.argv[5] if len(sys.argv) > 5 else "C"
    tempo_bpm = int(sys.argv[6]) if len(sys.argv) > 6 else 120

    result = generate_with_model(genre, length, temperature, instrument_name, key, tempo_bpm)
    print(json.dumps(result))
