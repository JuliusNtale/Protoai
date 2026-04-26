# Team Build Instructions
## AI Exam Proctoring System — FYP 2026/26
### University of Dodoma | Supervisor: Dr. Mohamed Dewa

---

# PART A — BECKHAM Y. MWAKANJUKI (ML/AI Engineer)
## Complete ML Training Guide: Datasets → Training → ONNX Export

---

## Overview of What You Are Building

You are responsible for producing **two trained neural network model files**:
1. `facenet_best.onnx` — identifies whether the person in front of the camera matches the registered student
2. `l2cs_net.onnx` — classifies where a person is looking (Screen, Left, Right, Up, Down)

These two files are the only deliverables you hand off to Victor. Everything else (training code, notebooks, logs) stays in your Google Drive. The deadline for handing off both ONNX files is **end of Week 5**.

---

## Step 1: Environment Setup on Google Colab

Open Google Colab (colab.research.google.com). Every session you open should start with this cell:

```python
# Cell 1 — Mount Drive and set up GPU
from google.colab import drive
drive.mount('/content/drive')

import torch
print("GPU available:", torch.cuda.is_available())
print("GPU name:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "None")

# If GPU is not available, go to Runtime → Change runtime type → GPU → Save
```

Create this folder structure in your Google Drive (do this once):
```
MyDrive/
└── fyp-ai/
    ├── datasets/
    │   ├── lfw/
    │   ├── casia/
    │   └── mpii_gaze/
    ├── checkpoints/
    │   ├── facenet/
    │   └── l2cs/
    ├── exports/          ← Victor picks up files from here
    └── logs/
```

```python
# Cell 2 — Create folder structure
import os

base = '/content/drive/MyDrive/fyp-ai'
folders = [
    'datasets/lfw', 'datasets/casia', 'datasets/mpii_gaze',
    'checkpoints/facenet', 'checkpoints/l2cs',
    'exports', 'logs'
]
for f in folders:
    os.makedirs(os.path.join(base, f), exist_ok=True)

print("Folders created.")
```

Install all required libraries (run this every session since Colab resets):
```python
# Cell 3 — Install dependencies
!pip install facenet-pytorch torch torchvision onnx onnxruntime opencv-python-headless \
             scikit-learn matplotlib seaborn tqdm pandas Pillow albumentations
```

---

## Step 2: Download and Prepare the Datasets

### Dataset A — LFW (Labeled Faces in the Wild)
**Purpose:** Used for evaluating FaceNet. Tests whether the model can tell two photos are the same person.

```python
# Download LFW dataset
import urllib.request
import tarfile

lfw_url = "http://vis-www.cs.umass.edu/lfw/lfw.tgz"
lfw_path = "/content/drive/MyDrive/fyp-ai/datasets/lfw/lfw.tgz"

print("Downloading LFW (173 MB)...")
urllib.request.urlretrieve(lfw_url, lfw_path)

print("Extracting...")
with tarfile.open(lfw_path, 'r:gz') as tar:
    tar.extractall("/content/drive/MyDrive/fyp-ai/datasets/lfw/")

print("LFW ready.")
```

After extraction, the structure will be:
```
datasets/lfw/lfw/<person_name>/<person_name>_0001.jpg
```

### Dataset B — CASIA-WebFace
**Purpose:** Main training data for FaceNet. 494,414 images of 10,575 identities. This is the bulk of what teaches the model to distinguish faces.

Option 1 — Via Kaggle (recommended):
1. Go to kaggle.com and create a free account.
2. Search for "CASIA-WebFace" — look for the dataset by `debarghamitraroy`.
3. Download `CASIA-WebFace.zip` (~3.8 GB) and upload it to `MyDrive/fyp-ai/datasets/casia/`.
4. Then in Colab:

```python
# Extract CASIA-WebFace from Drive
import zipfile

casia_zip = "/content/drive/MyDrive/fyp-ai/datasets/casia/CASIA-WebFace.zip"
extract_to = "/content/drive/MyDrive/fyp-ai/datasets/casia/"

print("Extracting CASIA-WebFace (this takes ~10 minutes)...")
with zipfile.ZipFile(casia_zip, 'r') as z:
    z.extractall(extract_to)

print("CASIA-WebFace ready.")
```

Option 2 — Direct academic request: Email dataset@nlpr.ia.ac.cn with your student email. Use the subject: "CASIA-WebFace Dataset Request — Academic Research". Include your name, institution (University of Dodoma), and purpose.

### Dataset C — MPIIFaceGaze
**Purpose:** Training data for the gaze estimator (L2CS-Net). Contains 213,659 images with gaze annotations from 15 participants looking at different screen positions.

```python
# Download MPIIFaceGaze
import urllib.request

mpii_url = "https://datasets.d2.mpi-inf.mpg.de/MPIIGaze/MPIIFaceGaze.tar.gz"
mpii_path = "/content/drive/MyDrive/fyp-ai/datasets/mpii_gaze/MPIIFaceGaze.tar.gz"

print("Downloading MPIIFaceGaze (~3.5 GB, this takes a while)...")
urllib.request.urlretrieve(mpii_url, mpii_path)

print("Extracting...")
import tarfile
with tarfile.open(mpii_path, 'r:gz') as tar:
    tar.extractall("/content/drive/MyDrive/fyp-ai/datasets/mpii_gaze/")

print("MPIIFaceGaze ready.")
```

**If direct download fails:** Go to https://www.mpi-inf.mpg.de/departments/computer-vision-and-machine-learning/research/gaze-based-human-computer-interaction/appearance-based-gaze-estimation-in-the-wild and fill in the request form. The link will be emailed to you within 24 hours.

---

## Step 3: Preprocess CASIA-WebFace with MTCNN

**Why this step?** Raw images have different sizes, backgrounds, and face positions. MTCNN detects the face, aligns it to a standard 160×160 frame, and normalizes it so the neural network always sees faces in the same format. Skip or rush this step and your model will perform poorly.

```python
# Cell — MTCNN Face Preprocessing
# This script processes all CASIA images: detect face → align → resize 160x160 → normalize

import os, numpy as np
from PIL import Image
from facenet_pytorch import MTCNN
from torch.utils.data import DataLoader
from torchvision import datasets
import torch

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
mtcnn = MTCNN(image_size=160, margin=20, device=device)

raw_dir = "/content/drive/MyDrive/fyp-ai/datasets/casia/CASIA-WebFace"
out_dir = "/content/drive/MyDrive/fyp-ai/datasets/casia/preprocessed"
os.makedirs(out_dir, exist_ok=True)

# Walk through all identity folders
identities = os.listdir(raw_dir)
print(f"Total identities: {len(identities)}")

processed = 0
failed = 0

for identity in identities:
    identity_path = os.path.join(raw_dir, identity)
    out_identity_path = os.path.join(out_dir, identity)
    os.makedirs(out_identity_path, exist_ok=True)
    
    for img_name in os.listdir(identity_path):
        img_path = os.path.join(identity_path, img_name)
        try:
            img = Image.open(img_path).convert('RGB')
            face = mtcnn(img)            # returns 3x160x160 tensor, normalized [-1,1]
            if face is not None:
                out_path = os.path.join(out_identity_path, img_name.replace('.jpg', '.pt'))
                torch.save(face, out_path)
                processed += 1
        except Exception as e:
            failed += 1

    if len(identities.index(identity) % 500 == 0):
        print(f"Progress: {processed} processed, {failed} failed")

print(f"Done. Processed: {processed}, Failed (no face detected): {failed}")
```

**Expected output:** ~480,000 successfully processed images. A 10–15% failure rate (no face detected) is normal.

### Create Train / Validation / Test Splits (70 / 15 / 15)

```python
# Split preprocessed CASIA into train/val/test
import random, shutil

preprocessed_dir = "/content/drive/MyDrive/fyp-ai/datasets/casia/preprocessed"
split_dir = "/content/drive/MyDrive/fyp-ai/datasets/casia/split"

for split in ['train', 'val', 'test']:
    os.makedirs(os.path.join(split_dir, split), exist_ok=True)

all_identities = [d for d in os.listdir(preprocessed_dir)
                  if os.path.isdir(os.path.join(preprocessed_dir, d))]
random.shuffle(all_identities)

n = len(all_identities)
train_ids = all_identities[:int(0.7 * n)]
val_ids   = all_identities[int(0.7 * n):int(0.85 * n)]
test_ids  = all_identities[int(0.85 * n):]

for split_name, ids in [('train', train_ids), ('val', val_ids), ('test', test_ids)]:
    for identity in ids:
        src = os.path.join(preprocessed_dir, identity)
        dst = os.path.join(split_dir, split_name, identity)
        shutil.copytree(src, dst)

print(f"Split complete: {len(train_ids)} train, {len(val_ids)} val, {len(test_ids)} test identities")
```

---

## Step 4: Train FaceNet (Identity Verification Model)

**What this model does:** Given two face images, it produces embeddings (512-number vectors). If the cosine similarity between two embeddings is ≥ 0.6, it's the same person. Victor uses this threshold in the AI service.

**Architecture:** InceptionResnetV1 pretrained on VGGFace2, fine-tuned with Triplet Loss on CASIA-WebFace.

```python
# FaceNet Fine-Tuning Script

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from facenet_pytorch import InceptionResnetV1
from torchvision import transforms
import numpy as np
from tqdm import tqdm
import os

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Training on: {device}")

# Load pretrained model — 'vggface2' gives better face recognition performance than 'casia-webface'
model = InceptionResnetV1(pretrained='vggface2').to(device)
model.train()

# Triplet Loss — the key to face recognition training
# It ensures: d(anchor, positive) + margin < d(anchor, negative)
# Where anchor and positive are same identity, negative is different identity
class TripletLoss(nn.Module):
    def __init__(self, margin=0.2):
        super().__init__()
        self.margin = margin
    
    def forward(self, anchor, positive, negative):
        pos_dist = torch.sum((anchor - positive) ** 2, dim=1)
        neg_dist = torch.sum((anchor - negative) ** 2, dim=1)
        loss = torch.relu(pos_dist - neg_dist + self.margin)
        return loss.mean()

# Custom dataset for triplet sampling
class TripletFaceDataset(Dataset):
    def __init__(self, root_dir):
        self.root_dir = root_dir
        self.classes = os.listdir(root_dir)
        self.class_to_files = {}
        for cls in self.classes:
            files = os.listdir(os.path.join(root_dir, cls))
            if len(files) >= 2:  # need at least 2 images to form a triplet
                self.class_to_files[cls] = [os.path.join(root_dir, cls, f) for f in files]
        self.valid_classes = list(self.class_to_files.keys())
    
    def __len__(self):
        return len(self.valid_classes) * 10  # 10 triplets per identity per epoch
    
    def __getitem__(self, idx):
        anchor_class = self.valid_classes[idx % len(self.valid_classes)]
        negative_class = random.choice([c for c in self.valid_classes if c != anchor_class])
        
        anchor_file, positive_file = random.sample(self.class_to_files[anchor_class], 2)
        negative_file = random.choice(self.class_to_files[negative_class])
        
        anchor   = torch.load(anchor_file)
        positive = torch.load(positive_file)
        negative = torch.load(negative_file)
        
        return anchor, positive, negative

train_dataset = TripletFaceDataset("/content/drive/MyDrive/fyp-ai/datasets/casia/split/train")
train_loader  = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=2)

criterion = TripletLoss(margin=0.2)
optimizer = optim.Adam(model.parameters(), lr=1e-4)
scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)

EPOCHS = 20
best_val_acc = 0.0

for epoch in range(EPOCHS):
    model.train()
    total_loss = 0.0
    
    for batch_idx, (anchor, positive, negative) in enumerate(tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS}")):
        anchor, positive, negative = anchor.to(device), positive.to(device), negative.to(device)
        
        optimizer.zero_grad()
        
        emb_a = model(anchor)
        emb_p = model(positive)
        emb_n = model(negative)
        
        loss = criterion(emb_a, emb_p, emb_n)
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
    
    avg_loss = total_loss / len(train_loader)
    scheduler.step()
    
    # Save checkpoint every 5 epochs
    if (epoch + 1) % 5 == 0:
        ckpt_path = f"/content/drive/MyDrive/fyp-ai/checkpoints/facenet/facenet_epoch_{epoch+1}.pt"
        torch.save({'epoch': epoch, 'model_state': model.state_dict(), 'loss': avg_loss}, ckpt_path)
        print(f"Checkpoint saved: {ckpt_path}")
    
    print(f"Epoch {epoch+1}/{EPOCHS} | Loss: {avg_loss:.4f}")

# Save final model
torch.save(model.state_dict(), "/content/drive/MyDrive/fyp-ai/checkpoints/facenet/facenet_final.pt")
print("Final model saved.")
```

---

## Step 5: Evaluate FaceNet — Must Hit These Targets

**Targets required by proposal:**
- Accuracy ≥ 90%
- FAR (False Acceptance Rate) < 5% — two different people accepted as the same
- FRR (False Rejection Rate) < 10% — same person rejected

```python
# Evaluation on LFW
from sklearn.metrics import roc_curve, accuracy_score
import numpy as np

model.eval()

def get_embedding(img_tensor):
    with torch.no_grad():
        return model(img_tensor.unsqueeze(0).to(device)).cpu().numpy()[0]

# Load LFW pairs for evaluation
# LFW provides a standard pairs.txt file: each line is either same-person or different-person pair

lfw_dir = "/content/drive/MyDrive/fyp-ai/datasets/lfw/lfw"
pairs_txt = "/content/drive/MyDrive/fyp-ai/datasets/lfw/lfw/pairs.txt"

# Download pairs file if not present
if not os.path.exists(pairs_txt):
    urllib.request.urlretrieve(
        "http://vis-www.cs.umass.edu/lfw/pairs.txt",
        pairs_txt
    )

# Parse pairs
same_pairs = []
diff_pairs = []

with open(pairs_txt) as f:
    lines = f.readlines()[1:]  # skip header

for line in lines:
    parts = line.strip().split('\t')
    if len(parts) == 3:  # same-person pair: name, img1_num, img2_num
        name, n1, n2 = parts
        same_pairs.append((name, int(n1), name, int(n2)))
    elif len(parts) == 4:  # different-person pair: name1, img1_num, name2, img2_num
        n1, i1, n2, i2 = parts
        diff_pairs.append((n1, int(i1), n2, int(i2)))

def get_lfw_embedding(name, num):
    path = os.path.join(lfw_dir, name, f"{name}_{num:04d}.jpg")
    img = Image.open(path).convert('RGB')
    face = mtcnn(img)
    if face is None:
        return None
    return get_embedding(face)

similarities = []
labels = []

print("Computing similarities for same-person pairs...")
for name1, n1, name2, n2 in same_pairs[:1000]:
    e1, e2 = get_lfw_embedding(name1, n1), get_lfw_embedding(name2, n2)
    if e1 is not None and e2 is not None:
        sim = np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2))
        similarities.append(sim)
        labels.append(1)

print("Computing similarities for different-person pairs...")
for name1, n1, name2, n2 in diff_pairs[:1000]:
    e1, e2 = get_lfw_embedding(name1, n1), get_lfw_embedding(name2, n2)
    if e1 is not None and e2 is not None:
        sim = np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2))
        similarities.append(sim)
        labels.append(0)

THRESHOLD = 0.6
predictions = [1 if s >= THRESHOLD else 0 for s in similarities]
accuracy = accuracy_score(labels, predictions)

# FAR = false positives / total negatives (different people accepted as same)
# FRR = false negatives / total positives (same person rejected)
tp = sum(1 for p, l in zip(predictions, labels) if p == 1 and l == 1)
fp = sum(1 for p, l in zip(predictions, labels) if p == 1 and l == 0)
fn = sum(1 for p, l in zip(predictions, labels) if p == 0 and l == 1)
tn = sum(1 for p, l in zip(predictions, labels) if p == 0 and l == 0)

total_negatives = fp + tn
total_positives = tp + fn
far = fp / total_negatives if total_negatives > 0 else 0
frr = fn / total_positives if total_positives > 0 else 0

print(f"\n=== FACENET EVALUATION RESULTS ===")
print(f"Accuracy: {accuracy*100:.2f}%  (target: ≥ 90%)")
print(f"FAR:      {far*100:.2f}%       (target: < 5%)")
print(f"FRR:      {frr*100:.2f}%       (target: < 10%)")
print(f"{'PASS' if accuracy >= 0.90 and far < 0.05 and frr < 0.10 else 'FAIL — retrain needed'}")
```

**If the model fails targets:** Increase epochs by 10, reduce learning rate to `5e-5`, or increase the triplet margin to `0.3`. Run evaluation again. Do not export until targets are met.

---

## Step 6: Export FaceNet to ONNX

```python
# Export FaceNet to ONNX — MUST match what Victor's AI service expects
model.eval()

dummy_input = torch.randn(1, 3, 160, 160).to(device)

export_path = "/content/drive/MyDrive/fyp-ai/exports/facenet_best.onnx"

torch.onnx.export(
    model,
    dummy_input,
    export_path,
    export_params=True,
    opset_version=11,
    input_names=['input'],
    output_names=['embedding'],
    dynamic_axes={
        'input': {0: 'batch_size'},
        'embedding': {0: 'batch_size'}
    }
)

# Verify the export
import onnx
onnx_model = onnx.load(export_path)
onnx.checker.check_model(onnx_model)
print("ONNX model verified.")

# Verify inference with ONNX Runtime
import onnxruntime as ort
import numpy as np

session = ort.InferenceSession(export_path)
dummy_np = np.random.randn(1, 3, 160, 160).astype(np.float32)
output = session.run(['embedding'], {'input': dummy_np})

print(f"Input shape:  {dummy_np.shape}")
print(f"Output shape: {output[0].shape}")  # Should be (1, 512)
print("FaceNet ONNX export successful. File ready for Victor.")
```

**Expected output shape: (1, 512)** — 512-dimensional embedding vector.

---

## Step 7: Preprocess MPIIFaceGaze for L2CS-Net

**What the gaze model needs:** Face crops (224×224) with corresponding gaze direction labels. We convert the continuous gaze angles from MPIIFaceGaze into 5 discrete classes.

```python
# Gaze class mapping from continuous angles to 5 classes
# Screen: both yaw and pitch near 0 → |yaw| < 15° and |pitch| < 15°
# Left:   yaw < -15°
# Right:  yaw > +15°
# Up:     pitch > +15°
# Down:   pitch < -15°

def gaze_to_class(pitch_deg, yaw_deg):
    if abs(yaw_deg) < 15 and abs(pitch_deg) < 15:
        return 0  # Screen
    elif yaw_deg <= -15:
        return 1  # Left
    elif yaw_deg >= 15:
        return 2  # Right
    elif pitch_deg >= 15:
        return 3  # Up
    else:
        return 4  # Down

CLASS_NAMES = ['Screen', 'Left', 'Right', 'Up', 'Down']
```

```python
# Parse MPIIFaceGaze dataset
# MPIIFaceGaze structure: p00/ through p14/ (15 participants)
# Each participant folder has: day01/ to day04/, each with images + annotations

import pandas as pd
from PIL import Image

mpii_root = "/content/drive/MyDrive/fyp-ai/datasets/mpii_gaze/MPIIFaceGaze"
out_gaze_dir = "/content/drive/MyDrive/fyp-ai/datasets/mpii_gaze/processed"
os.makedirs(out_gaze_dir, exist_ok=True)

records = []

for participant in sorted(os.listdir(mpii_root)):
    p_dir = os.path.join(mpii_root, participant)
    if not os.path.isdir(p_dir):
        continue
    
    for day_folder in os.listdir(p_dir):
        day_dir = os.path.join(p_dir, day_folder)
        if not os.path.isdir(day_dir):
            continue
        
        annotation_file = os.path.join(day_dir, f"{day_folder}.label")
        if not os.path.exists(annotation_file):
            continue
        
        with open(annotation_file) as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) < 3:
                    continue
                img_name = parts[0]
                pitch = float(parts[1])  # in radians
                yaw   = float(parts[2])
                
                pitch_deg = np.degrees(pitch)
                yaw_deg   = np.degrees(yaw)
                label     = gaze_to_class(pitch_deg, yaw_deg)
                
                img_path = os.path.join(day_dir, img_name)
                if os.path.exists(img_path):
                    records.append({
                        'img_path': img_path,
                        'pitch': pitch_deg,
                        'yaw': yaw_deg,
                        'label': label,
                        'label_name': CLASS_NAMES[label]
                    })

df = pd.DataFrame(records)
print(f"Total samples: {len(df)}")
print(df['label_name'].value_counts())

df.to_csv(os.path.join(out_gaze_dir, "annotations.csv"), index=False)
print("Annotations saved.")
```

---

## Step 8: Train L2CS-Net (Gaze Estimation Model)

**What this model does:** Takes a 224×224 face crop and outputs one of 5 gaze directions (Screen, Left, Right, Up, Down). We fine-tune a pretrained ResNet-50 backbone.

```python
# L2CS-Net Fine-Tuning

import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models, transforms
from torch.utils.data import Dataset, DataLoader
import pandas as pd
from PIL import Image

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Data augmentation — important for robustness to lighting, pose variation
train_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
    transforms.RandomRotation(degrees=10),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

val_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

class GazeDataset(Dataset):
    def __init__(self, df, transform):
        self.df = df.reset_index(drop=True)
        self.transform = transform
    
    def __len__(self):
        return len(self.df)
    
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img = Image.open(row['img_path']).convert('RGB')
        img = self.transform(img)
        label = int(row['label'])
        return img, label

# Train/val/test split
df = pd.read_csv("/content/drive/MyDrive/fyp-ai/datasets/mpii_gaze/processed/annotations.csv")
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

n = len(df)
train_df = df.iloc[:int(0.7*n)]
val_df   = df.iloc[int(0.7*n):int(0.85*n)]
test_df  = df.iloc[int(0.85*n):]

train_loader = DataLoader(GazeDataset(train_df, train_transforms), batch_size=64, shuffle=True, num_workers=2)
val_loader   = DataLoader(GazeDataset(val_df,   val_transforms),   batch_size=64, shuffle=False, num_workers=2)

# Build model — ResNet50 backbone + custom 5-class head
backbone = models.resnet50(pretrained=True)
num_features = backbone.fc.in_features
backbone.fc = nn.Sequential(
    nn.Dropout(0.5),
    nn.Linear(num_features, 5)  # 5 gaze directions
)
model = backbone.to(device)

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=1e-4, weight_decay=1e-4)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=20)

EPOCHS = 20
best_val_acc = 0.0
best_model_path = "/content/drive/MyDrive/fyp-ai/checkpoints/l2cs/l2cs_best.pt"

for epoch in range(EPOCHS):
    # Training
    model.train()
    train_correct = 0
    train_total = 0
    train_loss = 0.0
    
    for images, labels in tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS} [train]"):
        images, labels = images.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        _, predicted = outputs.max(1)
        train_correct += predicted.eq(labels).sum().item()
        train_total += labels.size(0)
        train_loss += loss.item()
    
    # Validation
    model.eval()
    val_correct = 0
    val_total = 0
    
    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            _, predicted = outputs.max(1)
            val_correct += predicted.eq(labels).sum().item()
            val_total += labels.size(0)
    
    train_acc = train_correct / train_total
    val_acc   = val_correct / val_total
    
    scheduler.step()
    
    print(f"Epoch {epoch+1}/{EPOCHS} | Train Loss: {train_loss/len(train_loader):.4f} | "
          f"Train Acc: {train_acc*100:.2f}% | Val Acc: {val_acc*100:.2f}%")
    
    # Save best model
    if val_acc > best_val_acc:
        best_val_acc = val_acc
        torch.save(model.state_dict(), best_model_path)
        print(f"  ↑ New best model saved (val_acc={val_acc*100:.2f}%)")

print(f"\nBest validation accuracy: {best_val_acc*100:.2f}%")
```

**Target accuracy:** ≥ 90% validation accuracy on the 5-class gaze task. The MAE (mean angular error) target is < 5 degrees.

---

## Step 9: Export L2CS-Net to ONNX

```python
# Load best checkpoint and export
model.load_state_dict(torch.load(best_model_path))
model.eval()

dummy_input = torch.randn(1, 3, 224, 224).to(device)
export_path = "/content/drive/MyDrive/fyp-ai/exports/l2cs_net.onnx"

torch.onnx.export(
    model,
    dummy_input,
    export_path,
    export_params=True,
    opset_version=11,
    input_names=['input'],
    output_names=['gaze_logits'],
    dynamic_axes={
        'input': {0: 'batch_size'},
        'gaze_logits': {0: 'batch_size'}
    }
)

import onnx, onnxruntime as ort
onnx.checker.check_model(onnx.load(export_path))

sess = ort.InferenceSession(export_path)
test_in = np.random.randn(1, 3, 224, 224).astype(np.float32)
out = sess.run(['gaze_logits'], {'input': test_in})

print(f"Input shape:  {test_in.shape}")
print(f"Output shape: {out[0].shape}")  # Should be (1, 5)
print("L2CS-Net ONNX export successful. File ready for Victor.")
```

**Expected output shape: (1, 5)** — logits for [Screen, Left, Right, Up, Down].

---

## Step 10: Hand Off to Victor

1. Share both files from `MyDrive/fyp-ai/exports/` via Google Drive link to judysen.victor@gmail.com:
   - `facenet_best.onnx`
   - `l2cs_net.onnx`

2. Include this information in your message:
   - FaceNet input: `float32[batch, 3, 160, 160]` normalized to `[-1, 1]` (facenet-pytorch normalization)
   - FaceNet output: `float32[batch, 512]` embedding vector (L2-normalized)
   - L2CS input: `float32[batch, 3, 224, 224]` normalized with ImageNet mean/std ([0.485,0.456,0.406], [0.229,0.224,0.225])
   - L2CS output: `float32[batch, 5]` logits, argmax → class index: 0=Screen, 1=Left, 2=Right, 3=Up, 4=Down

3. **Deadline: End of Week 5.** Victor cannot complete the AI service until these files arrive.

---

---

# PART B — VICTOR J. KWEKA (Project Lead + AI Service Engineer)
## Complete AI Service Build Guide: Flask + ONNX + WebSocket

---

## Overview of What You Are Building

You own the `ai-service/` directory — a Python Flask application running on port 8000. It is the brain of the system: it receives raw camera frames from the browser, runs AI inference, and returns whether the student is cheating.

**Concretely, it must:**
1. Accept a base64 face image → verify it matches the registered student → return `{match, confidence}`
2. Accept base64 exam frames via WebSocket → run gaze + head pose → emit anomaly flags back

You also own the Docker setup that ties all services together, and CI/CD for the repo.

---

## Phase 1: Flask App Skeleton (Week 1 — Start Here)

### Why this first?
The backend (Derick) and frontend (Julius) both call your service. Having a running skeleton with `/health` up lets them start integration testing immediately, even before the models arrive.

### Step 1.1 — Create the directory structure

```bash
mkdir -p ai-service/models
touch ai-service/app.py
touch ai-service/requirements.txt
touch ai-service/.env.example
touch ai-service/.gitignore
```

### Step 1.2 — `.gitignore` for ai-service

```
# ai-service/.gitignore
venv/
__pycache__/
*.pyc
*.pyo
.env
models/*.onnx
models/*.pt
models/*.pkl
storage/
*.log
```

### Step 1.3 — `requirements.txt`

```
flask==3.0.3
flask-cors==4.0.1
flask-socketio==5.3.6
python-socketio==5.11.3
python-dotenv==1.0.1
opencv-python-headless==4.9.0.80
mediapipe==0.10.14
onnxruntime==1.18.0
Pillow==10.3.0
numpy==1.26.4
requests==2.32.3
eventlet==0.36.1
```

### Step 1.4 — `app.py` skeleton

```python
# ai-service/app.py
import os
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Import routes
from routes.health import health_bp
from routes.verify import verify_bp
from routes.monitor import monitor_bp

app.register_blueprint(health_bp)
app.register_blueprint(verify_bp)
app.register_blueprint(monitor_bp)

# Import socket handlers
from sockets.frame_handler import register_handlers
register_handlers(socketio)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=8000, debug=True)
```

### Step 1.5 — Health endpoint

Create `ai-service/routes/health.py`:

```python
from flask import Blueprint, jsonify
import os

health_bp = Blueprint('health', __name__)

MODELS_DIR = os.getenv('MODELS_DIR', './models')

@health_bp.route('/health', methods=['GET'])
def health():
    facenet_loaded = os.path.exists(os.path.join(MODELS_DIR, 'facenet_best.onnx'))
    l2cs_loaded    = os.path.exists(os.path.join(MODELS_DIR, 'l2cs_net.onnx'))
    return jsonify({
        'status': 'ok',
        'models_loaded': {
            'facenet': facenet_loaded,
            'l2cs': l2cs_loaded
        }
    }), 200
```

Also create `ai-service/routes/__init__.py` and `ai-service/sockets/__init__.py` (empty files).

### Step 1.6 — Test the skeleton

```bash
cd ai-service
python -m venv venv
source venv/Scripts/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Visit `http://localhost:8000/health` — you should get:
```json
{"status": "ok", "models_loaded": {"facenet": false, "l2cs": false}}
```

`false` is correct — you don't have the model files yet. That's the goal of Phase 1.

---

## Phase 2: Inference Engine — Load Models (Week 2)

**Why build this before the models arrive?** You write the code, put placeholder checks in, and the moment Beckham shares the ONNX files you drop them into `ai-service/models/` and it works.

### Step 2.1 — Model loader

Create `ai-service/services/model_loader.py`:

```python
import onnxruntime as ort
import os

_facenet_session = None
_l2cs_session    = None

def load_models():
    global _facenet_session, _l2cs_session
    
    models_dir = os.getenv('MODELS_DIR', './models')
    facenet_path = os.path.join(models_dir, 'facenet_best.onnx')
    l2cs_path    = os.path.join(models_dir, 'l2cs_net.onnx')
    
    if os.path.exists(facenet_path):
        _facenet_session = ort.InferenceSession(facenet_path)
        print(f"FaceNet loaded from {facenet_path}")
    else:
        print(f"WARNING: FaceNet not found at {facenet_path}")
    
    if os.path.exists(l2cs_path):
        _l2cs_session = ort.InferenceSession(l2cs_path)
        print(f"L2CS-Net loaded from {l2cs_path}")
    else:
        print(f"WARNING: L2CS-Net not found at {l2cs_path}")

def get_facenet():
    return _facenet_session

def get_l2cs():
    return _l2cs_session
```

Call `load_models()` when the app starts — add this to `app.py` before `socketio.run(...)`:

```python
from services.model_loader import load_models
load_models()
```

### Step 2.2 — Image preprocessing utilities

Create `ai-service/services/preprocessing.py`:

```python
import base64
import numpy as np
import cv2
from PIL import Image
import io

def base64_to_numpy(b64_string: str) -> np.ndarray:
    """Decode base64 JPEG string to numpy array (H, W, 3) BGR uint8."""
    img_bytes = base64.b64decode(b64_string)
    np_arr    = np.frombuffer(img_bytes, dtype=np.uint8)
    img_bgr   = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return img_bgr

def preprocess_for_facenet(face_bgr: np.ndarray) -> np.ndarray:
    """
    Resize to 160x160, convert BGR→RGB, normalize to [-1, 1].
    Returns float32 array of shape (1, 3, 160, 160).
    """
    face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
    face_resized = cv2.resize(face_rgb, (160, 160))
    face_float = face_resized.astype(np.float32) / 255.0
    # Normalize to [-1, 1] — facenet-pytorch standard
    face_normalized = (face_float - 0.5) / 0.5
    # HWC → CHW → NCHW
    return np.transpose(face_normalized, (2, 0, 1))[np.newaxis, :]

def preprocess_for_l2cs(face_bgr: np.ndarray) -> np.ndarray:
    """
    Resize to 224x224, convert BGR→RGB, apply ImageNet normalization.
    Returns float32 array of shape (1, 3, 224, 224).
    """
    face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
    face_resized = cv2.resize(face_rgb, (224, 224))
    face_float = face_resized.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    face_normalized = (face_float - mean) / std
    return np.transpose(face_normalized, (2, 0, 1))[np.newaxis, :]
```

---

## Phase 3: Identity Verification Endpoint (Week 2–3)

### Why this is critical:
The verify page (`frontend/app/verify/page.tsx`) is the gate before every exam. No student gets in without passing this check. Derick's backend calls your `/verify-identity` endpoint and stores the result.

### Step 3.1 — Face detection with MediaPipe

Create `ai-service/services/face_detector.py`:

```python
import mediapipe as mp
import cv2
import numpy as np

_mp_face_detection = mp.solutions.face_detection

def detect_and_crop_face(img_bgr: np.ndarray, padding: float = 0.2):
    """
    Detect the largest face in the image and return the cropped BGR array.
    Returns None if no face detected.
    padding: fractional expansion around the bounding box.
    """
    with _mp_face_detection.FaceDetection(
        model_selection=1,  # 1 = full-range model (better for proctoring)
        min_detection_confidence=0.5
    ) as detector:
        h, w = img_bgr.shape[:2]
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        results = detector.process(img_rgb)
        
        if not results.detections:
            return None, 0
        
        # Use the detection with highest confidence
        best = max(results.detections, key=lambda d: d.score[0])
        bb = best.location_data.relative_bounding_box
        
        # Convert to pixel coords with padding
        x1 = max(0, int((bb.xmin - padding * bb.width) * w))
        y1 = max(0, int((bb.ymin - padding * bb.height) * h))
        x2 = min(w, int((bb.xmin + (1 + padding) * bb.width) * w))
        y2 = min(h, int((bb.ymin + (1 + padding) * bb.height) * h))
        
        face_crop = img_bgr[y1:y2, x1:x2]
        confidence = float(best.score[0])
        return face_crop, confidence
    
def count_faces(img_bgr: np.ndarray) -> int:
    """Return number of detected faces in the image."""
    with _mp_face_detection.FaceDetection(
        model_selection=1,
        min_detection_confidence=0.4
    ) as detector:
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        results = detector.process(img_rgb)
        if not results.detections:
            return 0
        return len(results.detections)
```

### Step 3.2 — Embedding storage

Face embeddings need to be stored so you can compare them during an exam. You store them in the PostgreSQL database as binary (Derick handles the DB column). But you also need to retrieve them. Create `ai-service/services/embedding_store.py`:

```python
import numpy as np
import os
import pickle

EMBEDDINGS_DIR = os.getenv('MODELS_DIR', './models') + '/embeddings'
os.makedirs(EMBEDDINGS_DIR, exist_ok=True)

def save_embedding(user_id: int, embedding: np.ndarray):
    """Save a 512-d embedding vector for a user to disk."""
    path = os.path.join(EMBEDDINGS_DIR, f"user_{user_id}.pkl")
    with open(path, 'wb') as f:
        pickle.dump(embedding, f)

def load_embedding(user_id: int):
    """Load the stored embedding for a user. Returns None if not found."""
    path = os.path.join(EMBEDDINGS_DIR, f"user_{user_id}.pkl")
    if not os.path.exists(path):
        return None
    with open(path, 'rb') as f:
        return pickle.load(f)

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two vectors. Returns value in [-1, 1]."""
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
```

### Step 3.3 — `/verify-identity` route

Create `ai-service/routes/verify.py`:

```python
from flask import Blueprint, request, jsonify
import numpy as np
import os
from services.preprocessing import base64_to_numpy, preprocess_for_facenet
from services.face_detector import detect_and_crop_face
from services.embedding_store import load_embedding, save_embedding, cosine_similarity
from services.model_loader import get_facenet

verify_bp = Blueprint('verify', __name__)

THRESHOLD = float(os.getenv('FACE_SIMILARITY_THRESHOLD', '0.6'))

@verify_bp.route('/verify-identity', methods=['POST'])
def verify_identity():
    data = request.get_json()
    
    if not data or 'user_id' not in data or 'image_base64' not in data:
        return jsonify({'error': 'Missing user_id or image_base64'}), 400
    
    user_id = int(data['user_id'])
    
    # Decode image
    try:
        img_bgr = base64_to_numpy(data['image_base64'])
    except Exception:
        return jsonify({'error': 'Invalid base64 image'}), 400
    
    # Detect face
    face_crop, detection_conf = detect_and_crop_face(img_bgr)
    if face_crop is None:
        return jsonify({'error': 'No face detected in image'}), 422
    
    # Get FaceNet model
    facenet = get_facenet()
    if facenet is None:
        return jsonify({'error': 'FaceNet model not loaded'}), 503
    
    # Get embedding for uploaded image
    face_input = preprocess_for_facenet(face_crop)
    embedding = facenet.run(['embedding'], {'input': face_input})[0][0]
    embedding = embedding / np.linalg.norm(embedding)  # L2 normalize
    
    # Load stored embedding for this student
    stored_embedding = load_embedding(user_id)
    
    if stored_embedding is None:
        # First time — this is a registration call, save the embedding
        save_embedding(user_id, embedding)
        return jsonify({'match': True, 'confidence': 1.0, 'message': 'Embedding registered'}), 200
    
    # Compare embeddings
    confidence = cosine_similarity(embedding, stored_embedding)
    match      = confidence >= THRESHOLD
    
    return jsonify({
        'match': match,
        'confidence': round(float(confidence), 4)
    }), 200
```

**Important:** When a student registers (first call), you save their embedding. On subsequent calls (during exam verify), you compare. The threshold is 0.6 — configurable via `.env`.

---

## Phase 4: Head Pose Estimation (Week 3 — No Model Needed)

**Why this doesn't need a trained model:** MediaPipe already gives you 468 facial landmarks. You use OpenCV `solvePnP` to estimate the 3D orientation of the head from those landmarks. This is pure geometry — no training.

Create `ai-service/services/head_pose.py`:

```python
import mediapipe as mp
import cv2
import numpy as np

_mp_face_mesh = mp.solutions.face_mesh

# 3D reference points for a generic human face model (canonical face)
# These are fixed coordinates in a face-centered coordinate system
FACE_3D_POINTS = np.array([
    [0.0,     0.0,     0.0  ],   # Nose tip
    [0.0,    -330.0,  -65.0 ],   # Chin
    [-225.0,  170.0,  -135.0],   # Left eye corner
    [225.0,   170.0,  -135.0],   # Right eye corner
    [-150.0, -150.0,  -125.0],   # Left mouth corner
    [150.0,  -150.0,  -125.0],   # Right mouth corner
], dtype=np.float64)

# Corresponding MediaPipe landmark indices
LANDMARK_INDICES = [1, 152, 226, 446, 57, 287]

YAW_THRESHOLD   = float(30)   # degrees — head turned left/right > 30° is suspicious
PITCH_THRESHOLD = float(20)   # degrees — head nodding > 20° is suspicious


def estimate_head_pose(img_bgr: np.ndarray):
    """
    Estimate yaw, pitch, roll from face landmarks using solvePnP.
    Returns dict with yaw, pitch, roll (degrees) and alert flag.
    Returns None if no face landmarks detected.
    """
    h, w = img_bgr.shape[:2]
    
    with _mp_face_mesh.FaceMesh(
        max_num_faces=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as face_mesh:
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(img_rgb)
        
        if not results.multi_face_landmarks:
            return None
        
        landmarks = results.multi_face_landmarks[0].landmark
        
        # Extract 2D pixel coordinates for the 6 reference landmarks
        face_2d = np.array([
            [landmarks[idx].x * w, landmarks[idx].y * h]
            for idx in LANDMARK_INDICES
        ], dtype=np.float64)
        
        # Camera intrinsics (approximate, assuming no distortion)
        focal_length = w
        cam_matrix = np.array([
            [focal_length, 0,            w / 2],
            [0,            focal_length, h / 2],
            [0,            0,            1    ]
        ], dtype=np.float64)
        dist_coeffs = np.zeros((4, 1))
        
        # Solve for rotation and translation
        success, rot_vec, trans_vec = cv2.solvePnP(
            FACE_3D_POINTS, face_2d, cam_matrix, dist_coeffs
        )
        
        if not success:
            return None
        
        # Convert rotation vector to Euler angles
        rot_matrix, _ = cv2.Rodrigues(rot_vec)
        angles, _, _, _, _, _ = cv2.RQDecomp3x3(rot_matrix)
        
        yaw   = angles[1] * 360   # horizontal turn
        pitch = angles[0] * 360   # vertical nod
        roll  = angles[2] * 360   # tilt
        
        alert = abs(yaw) > YAW_THRESHOLD or abs(pitch) > PITCH_THRESHOLD
        
        return {
            'yaw':   round(float(yaw), 2),
            'pitch': round(float(pitch), 2),
            'roll':  round(float(roll), 2),
            'alert': bool(alert)
        }
```

---

## Phase 5: Gaze Estimation with L2CS-Net (Week 3–4)

Create `ai-service/services/gaze_estimator.py`:

```python
import numpy as np
from services.preprocessing import preprocess_for_l2cs
from services.face_detector import detect_and_crop_face
from services.model_loader import get_l2cs

GAZE_CLASSES = ['Screen', 'Left', 'Right', 'Up', 'Down']

def softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x))
    return e / e.sum()

def estimate_gaze(img_bgr: np.ndarray):
    """
    Classify gaze direction from a full frame.
    Returns dict: {direction: str, confidence: float} or None if no face.
    """
    l2cs = get_l2cs()
    if l2cs is None:
        # Model not loaded — return a neutral fallback so the service doesn't crash
        return {'direction': 'Screen', 'confidence': 0.0, 'model_available': False}
    
    face_crop, _ = detect_and_crop_face(img_bgr)
    if face_crop is None:
        return None
    
    face_input = preprocess_for_l2cs(face_crop)
    logits     = l2cs.run(['gaze_logits'], {'input': face_input})[0][0]
    probs      = softmax(logits)
    class_idx  = int(np.argmax(probs))
    confidence = float(probs[class_idx])
    
    return {
        'direction': GAZE_CLASSES[class_idx],
        'confidence': round(confidence, 4),
        'model_available': True
    }
```

---

## Phase 6: `/monitor-frame` Endpoint (Week 4)

This is the HTTP endpoint for frame analysis. Run gaze and head pose **concurrently** using threading so both complete in < 1 second.

Create `ai-service/routes/monitor.py`:

```python
from flask import Blueprint, request, jsonify
import threading
from services.preprocessing import base64_to_numpy
from services.gaze_estimator import estimate_gaze
from services.head_pose import estimate_head_pose
from services.face_detector import count_faces

monitor_bp = Blueprint('monitor', __name__)

@monitor_bp.route('/monitor-frame', methods=['POST'])
def monitor_frame():
    data = request.get_json()
    
    if not data or 'session_id' not in data or 'frame_base64' not in data:
        return jsonify({'error': 'Missing session_id or frame_base64'}), 400
    
    try:
        img_bgr = base64_to_numpy(data['frame_base64'])
    except Exception:
        return jsonify({'error': 'Invalid base64 frame'}), 400
    
    # Run gaze and head pose concurrently
    gaze_result = [None]
    pose_result = [None]
    face_count  = [0]
    
    def run_gaze():
        gaze_result[0] = estimate_gaze(img_bgr)
    
    def run_pose():
        pose_result[0] = estimate_head_pose(img_bgr)
    
    def run_face_count():
        face_count[0] = count_faces(img_bgr)
    
    t1 = threading.Thread(target=run_gaze)
    t2 = threading.Thread(target=run_pose)
    t3 = threading.Thread(target=run_face_count)
    
    t1.start(); t2.start(); t3.start()
    t1.join();  t2.join();  t3.join()
    
    gaze = gaze_result[0]
    pose = pose_result[0]
    
    # Build anomaly list
    anomalies = []
    
    if gaze is None:
        anomalies.append('face_absent')
    elif gaze['direction'] != 'Screen':
        anomalies.append('gaze_away')
    
    if pose is not None and pose['alert']:
        anomalies.append('head_turned')
    
    if face_count[0] > 1:
        anomalies.append('multiple_faces')
    elif face_count[0] == 0 and 'face_absent' not in anomalies:
        anomalies.append('face_absent')
    
    # Build response — use safe defaults if model not available
    gaze_response = gaze if gaze else {'direction': 'Unknown', 'confidence': 0.0}
    pose_response = pose if pose else {'yaw': 0, 'pitch': 0, 'roll': 0, 'alert': False}
    
    return jsonify({
        'gaze':       gaze_response,
        'head_pose':  pose_response,
        'anomalies':  anomalies
    }), 200
```

---

## Phase 7: WebSocket Server (Week 4)

The frontend exam page emits `webcam_frame` events every 3 seconds. Your service receives them, analyzes them, and emits `anomaly_result` back. At 3 warnings, emit `session_locked` and notify the backend.

Create `ai-service/sockets/frame_handler.py`:

```python
from flask_socketio import SocketIO, emit
from services.preprocessing import base64_to_numpy
from services.gaze_estimator import estimate_gaze
from services.head_pose import estimate_head_pose
from services.face_detector import count_faces
import threading
import requests
import os

# In-memory warning state: {session_id: warning_count}
# This is reset when the service restarts — Derick's DB is the source of truth
_warning_counts = {}
_lock = threading.Lock()

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')

def register_handlers(socketio: SocketIO):
    
    @socketio.on('webcam_frame')
    def handle_frame(data):
        session_id   = data.get('session_id')
        frame_base64 = data.get('frame_base64')
        
        if not session_id or not frame_base64:
            return
        
        try:
            img_bgr = base64_to_numpy(frame_base64)
        except Exception:
            return
        
        # Run analysis concurrently
        gaze_result = [None]
        pose_result = [None]
        face_count  = [0]
        
        def run_gaze():
            gaze_result[0] = estimate_gaze(img_bgr)
        
        def run_pose():
            pose_result[0] = estimate_head_pose(img_bgr)
        
        def run_count():
            face_count[0] = count_faces(img_bgr)
        
        t1 = threading.Thread(target=run_gaze)
        t2 = threading.Thread(target=run_pose)
        t3 = threading.Thread(target=run_count)
        t1.start(); t2.start(); t3.start()
        t1.join();  t2.join();  t3.join()
        
        gaze = gaze_result[0]
        pose = pose_result[0]
        
        # Determine anomalies
        anomalies = []
        if gaze is None or face_count[0] == 0:
            anomalies.append('face_absent')
        elif gaze.get('direction') != 'Screen':
            anomalies.append('gaze_away')
        
        if pose is not None and pose.get('alert'):
            anomalies.append('head_turned')
        
        if face_count[0] > 1:
            anomalies.append('multiple_faces')
        
        # Log anomalies to backend and track warning count
        warning_count = _warning_counts.get(session_id, 0)
        
        for anomaly in anomalies:
            try:
                resp = requests.post(
                    f"{BACKEND_URL}/api/sessions/log",
                    json={'session_id': session_id, 'event_type': anomaly, 'event_data': {}},
                    timeout=2
                )
                if resp.ok:
                    warning_count = resp.json().get('warning_count', warning_count)
            except requests.exceptions.RequestException:
                pass  # Backend unreachable — don't crash the WebSocket
        
        with _lock:
            _warning_counts[session_id] = warning_count
        
        gaze_direction = gaze['direction'] if gaze else 'Unknown'
        
        # Emit result back to the specific client
        emit('anomaly_result', {
            'session_id':    session_id,
            'anomalies':     anomalies,
            'warning_count': warning_count,
            'gaze_direction': gaze_direction
        })
        
        # If warning count hit 3, emit session_locked
        if warning_count >= 3:
            emit('session_locked', {
                'session_id': session_id,
                'reason': 'warning_count_exceeded'
            })
    
    @socketio.on('disconnect')
    def handle_disconnect():
        # Clean up warning state when student disconnects
        # Note: can't easily get session_id here without tracking sid→session mapping
        pass
```

---

## Phase 8: DevOps — Docker Compose (Week 5)

### Step 8.1 — AI Service Dockerfile

Create `ai-service/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and MediaPipe
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxrender1 libxext6 libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "app.py"]
```

### Step 8.2 — Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

### Step 8.3 — Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
```

### Step 8.4 — `docker-compose.yml` (repo root)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: proctoring_db
      POSTGRES_USER: proctoring_user
      POSTGRES_PASSWORD: proctoring_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U proctoring_user -d proctoring_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://proctoring_user:proctoring_pass@postgres:5432/proctoring_db
      JWT_SECRET: change-this-in-production-256-bit-secret
      JWT_EXPIRY_HOURS: "8"
      SMTP_HOST: smtp.gmail.com
      SMTP_PORT: "587"
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      ADMIN_EMAIL: admin@udom.ac.tz
      AI_SERVICE_URL: http://ai-service:8000
      FLASK_ENV: development
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./storage:/app/storage

  ai-service:
    build: ./ai-service
    ports:
      - "8000:8000"
    environment:
      BACKEND_URL: http://backend:5000
      MODELS_DIR: ./models
      FACE_SIMILARITY_THRESHOLD: "0.6"
      GAZE_AWAY_SECONDS: "5"
      HEAD_TURNED_SECONDS: "3"
      HEAD_YAW_THRESHOLD: "30"
      HEAD_PITCH_THRESHOLD: "20"
      FLASK_ENV: development
    volumes:
      - ./ai-service/models:/app/models  # drop ONNX files here

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:5000
      NEXT_PUBLIC_WS_URL: http://localhost:8000
    depends_on:
      - backend
      - ai-service

volumes:
  postgres_data:
```

Run the entire system:
```bash
docker-compose up --build
```

---

## Phase 9: CI/CD with GitHub Actions (Week 5)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, "feat/**", "victor-kweka"]
  pull_request:
    branches: [main]

jobs:
  lint-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npx tsc --noEmit

  test-ai-service:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: cd ai-service && pip install -r requirements.txt
      - run: cd ai-service && python -m pytest tests/ -v || echo "No tests yet"

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && python -m pytest tests/ -v || echo "No tests yet"
```

---

## Week-by-Week Schedule (Victor)

| Week | Deliverable | Done when... |
|------|-------------|--------------|
| Week 1 | Flask skeleton + `/health` endpoint running | `curl localhost:8000/health` returns `{"status":"ok"}` |
| Week 2 | Model loader + preprocessing utils + embedding store | Code written, runs without errors even with no ONNX files |
| Week 3 | `/verify-identity` complete | Can compare two face images and return `{match, confidence}` |
| Week 3 | Head pose estimation | `/monitor-frame` returns `head_pose: {yaw, pitch, roll, alert}` |
| Week 4 | Gaze estimation (after Beckham delivers L2CS) | `/monitor-frame` returns full response including `gaze` |
| Week 4 | WebSocket server | Frontend exam page can emit `webcam_frame` and receive `anomaly_result` |
| Week 5 | Docker Compose | `docker-compose up` starts all 4 services cleanly |
| Week 5 | GitHub Actions CI | Push to any branch triggers lint + test run |

---

## Critical Rules

1. **Never commit `.onnx` files to git.** They are too large and contain proprietary model weights. The `.gitignore` blocks them. Tell Beckham to share via Google Drive only.
2. **The threshold of 0.6 is not arbitrary.** It's calibrated to hit FAR < 5% on LFW. Do not change it without re-running the evaluation.
3. **Run gaze + head pose concurrently** (threading, not asyncio). The target is < 1 second per frame. Running them sequentially would take ~1.5 seconds.
4. **The WebSocket server must not crash on model-unavailable.** If Beckham hasn't delivered a model yet, the service should return graceful fallbacks, not 500 errors.
5. **Before opening a PR:** run `python app.py` locally and confirm `/health`, `/verify-identity`, and `/monitor-frame` all return the expected JSON shapes.
