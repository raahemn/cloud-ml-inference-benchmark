import torch
import torch.nn as nn
import torch.optim as optim
import torchvision
import torchvision.transforms as transforms
from torchvision.models import resnet18, ResNet18_Weights

# 1. Configuration & Hyperparameters
BATCH_SIZE = 64
LEARNING_RATE = 0.001
EPOCHS = 5
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
SAVE_PATH = "../backend/app/ml-models/resnet18_cifar10.pth"

def main():
    print(f"Using device: {DEVICE}")

    # 2. Data Preparation
    # Note: CIFAR-10 images are 32x32. ResNet expects 224x224.
    # We resize them so the pre-trained features remain effective.
    transform = transforms.Compose([
        transforms.Resize(224), 
        transforms.ToTensor(),
        transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
    ])

    trainset = torchvision.datasets.CIFAR10(root='./data', train=True, download=True, transform=transform)
    trainloader = torch.utils.data.DataLoader(trainset, batch_size=BATCH_SIZE, shuffle=True)

    # 3. Load Pre-trained Model
    model = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)

    # 2. FREEZE all layers
    for param in model.parameters():
        param.requires_grad = False

    # 4. Modify the Head (The "Transfer" in Transfer Learning)
    # ResNet18's final layer is 'fc'. We replace it with a new layer for 10 classes.
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 10) 
    
    model = model.to(DEVICE)

    # 5. Loss Function and Optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.fc.parameters(), lr=LEARNING_RATE)

    # 6. Training Loop
    print("Starting training...")
    model.train()
    for epoch in range(EPOCHS):
        running_loss = 0.0
        for i, (inputs, labels) in enumerate(trainloader):
            inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            if i % 100 == 99:    # Print every 100 mini-batches
                print(f"[{epoch + 1}, {i + 1}] loss: {running_loss / 100:.3f}")
                running_loss = 0.0

    print("Finished Training")

    # 7. Save the Model
    # We save the state_dict, which is the standard professional way to save weights.
    torch.save(model.state_dict(), SAVE_PATH)
    print(f"Model saved to {SAVE_PATH}")

if __name__ == "__main__":
    main()