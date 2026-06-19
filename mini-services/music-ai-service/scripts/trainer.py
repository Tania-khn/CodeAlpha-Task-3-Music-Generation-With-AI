#!/usr/bin/env python3
"""
LSTM Music Model Trainer
Trains an LSTM-based deep learning model on preprocessed music data using PyTorch.
"""

import sys
import json
import os
import pickle
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

DATA_DIR = Path(__file__).parent.parent / "data"
PROCESSED_DIR = DATA_DIR / "processed"
MODELS_DIR = DATA_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


class MusicDataset(Dataset):
    """PyTorch Dataset for music note sequences"""

    def __init__(self, sequences, pitch_to_int, seq_length):
        self.sequences = sequences
        self.pitch_to_int = pitch_to_int
        self.seq_length = seq_length

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        seq = self.sequences[idx]
        input_pitches = []
        for n in seq["input"]:
            if isinstance(n, dict):
                pitch = n.get("pitch", 60)
            else:
                pitch = n
            input_pitches.append(self.pitch_to_int.get(pitch, 0))

        output_pitch = seq["output"]
        if isinstance(output_pitch, dict):
            output_pitch = output_pitch.get("pitch", 60)

        x = torch.tensor(input_pitches, dtype=torch.long)
        y = torch.tensor(self.pitch_to_int.get(output_pitch, 0), dtype=torch.long)
        return x, y


class MusicLSTM(nn.Module):
    """LSTM model for music generation"""

    def __init__(self, vocab_size, embedding_dim=128, hidden_dim=256, num_layers=3, dropout=0.3):
        super(MusicLSTM, self).__init__()

        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        # Embedding layer
        self.embedding = nn.Embedding(vocab_size, embedding_dim)

        # LSTM layers
        self.lstm = nn.LSTM(
            embedding_dim,
            hidden_dim,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0,
            batch_first=True,
        )

        # Fully connected output layer
        self.fc = nn.Linear(hidden_dim, vocab_size)

        # Dropout
        self.dropout = nn.Dropout(dropout)

    def forward(self, x, hidden=None):
        # Embed input
        embedded = self.embedding(x)

        # Pass through LSTM
        lstm_out, hidden = self.lstm(embedded, hidden)

        # Take the output from the last time step
        out = self.dropout(lstm_out[:, -1, :])

        # Pass through fully connected layer
        out = self.fc(out)

        return out, hidden

    def init_hidden(self, batch_size):
        """Initialize hidden state"""
        weight = next(self.parameters()).data
        hidden = (
            weight.new(self.num_layers, batch_size, self.hidden_dim).zero_(),
            weight.new(self.num_layers, batch_size, self.hidden_dim).zero_(),
        )
        return hidden


def train_model(genre, epochs=50, seq_length=32):
    """Train the LSTM model for a given genre. Auto-preprocesses if needed."""
    # Load preprocessed data
    processed_path = PROCESSED_DIR / f"{genre}_processed.pkl"
    if not processed_path.exists():
        # Auto-preprocess first
        print(f"No preprocessed data for {genre}, auto-preprocessing...", file=sys.stderr)
        from preprocessor import preprocess_genre
        prep_result = preprocess_genre(genre, seq_length)
        if "error" in prep_result:
            return prep_result

    if not processed_path.exists():
        return {"error": f"Failed to preprocess data for {genre}."}

    with open(processed_path, "rb") as f:
        data = pickle.load(f)

    sequences = data["sequences"]
    pitch_to_int = data["pitch_to_int"]
    int_to_pitch = data["int_to_pitch"]
    vocab_size = data["num_unique_pitches"]

    if vocab_size < 2:
        return {"error": "Not enough unique pitches for training"}

    print(f"Training LSTM for {genre}: {len(sequences)} sequences, {vocab_size} unique pitches", file=sys.stderr)

    # Create dataset and dataloader
    dataset = MusicDataset(sequences, pitch_to_int, seq_length)
    dataloader = DataLoader(dataset, batch_size=32, shuffle=True, drop_last=True)

    # Initialize model
    device = torch.device("cpu")
    model = MusicLSTM(
        vocab_size=vocab_size,
        embedding_dim=128,
        hidden_dim=256,
        num_layers=3,
        dropout=0.3,
    ).to(device)

    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.5)

    # Training loop
    losses = []
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        batch_count = 0

        for batch_x, batch_y in dataloader:
            batch_x = batch_x.to(device)
            batch_y = batch_y.to(device)

            optimizer.zero_grad()
            output, _ = model(batch_x)
            loss = criterion(output, batch_y)
            loss.backward()

            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)

            optimizer.step()
            total_loss += loss.item()
            batch_count += 1

        scheduler.step()

        avg_loss = total_loss / max(batch_count, 1)
        losses.append(avg_loss)

        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1}/{epochs}, Loss: {avg_loss:.4f}", file=sys.stderr)

    # Save model
    model_path = MODELS_DIR / f"{genre}_lstm.pt"
    torch.save({
        "model_state_dict": model.state_dict(),
        "pitch_to_int": pitch_to_int,
        "int_to_pitch": int_to_pitch,
        "vocab_size": vocab_size,
        "hidden_dim": 256,
        "num_layers": 3,
        "embedding_dim": 128,
        "seq_length": seq_length,
        "losses": losses,
        "genre": genre,
    }, model_path)

    return {
        "genre": genre,
        "epochs": epochs,
        "final_loss": losses[-1] if losses else None,
        "vocab_size": vocab_size,
        "sequences_trained": len(sequences),
        "model_path": str(model_path),
        "loss_history": [round(l, 4) for l in losses[::5]],  # Sample every 5 epochs
    }


if __name__ == "__main__":
    genre = sys.argv[1] if len(sys.argv) > 1 else "classical"
    epochs = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    seq_length = int(sys.argv[3]) if len(sys.argv) > 3 else 32
    result = train_model(genre, epochs, seq_length)
    print(json.dumps(result))
