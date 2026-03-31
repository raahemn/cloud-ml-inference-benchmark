import io
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from config import settings
import pillow_avif

class ResNetTrainer:
    def __init__(self, model_stream):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Load Architecture
        self.model = models.resnet18(weights=None)
        num_ftrs = self.model.fc.in_features
        self.model.fc = nn.Linear(num_ftrs, 10)
        
        # Load Weights from Memory Stream
        state_dict = torch.load(model_stream, map_location=self.device)
        self.model.load_state_dict(state_dict)
        
        # Freeze backbone, train only the head
        for param in self.model.parameters():
            param.requires_grad = False
        for param in self.model.fc.parameters():
            param.requires_grad = True
            
        self.model.to(self.device)

    def run_finetuning(self, epochs=3):
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
        ])

        valid_extensions = ('.jpg', '.jpeg', '.png', '.ppm', '.bmp', '.pgm', '.tif', '.tiff', '.webp', '.avif')

        dataset = datasets.ImageFolder(
            root=settings.LOCAL_DATA_DIR, 
            transform=transform,
            is_valid_file=lambda x: x.lower().endswith(valid_extensions)
        )

        loader = torch.utils.data.DataLoader(dataset, batch_size=32, shuffle=True)

        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(self.model.fc.parameters(), lr=0.001)

        self.model.train()
        for epoch in range(epochs):
            for inputs, labels in loader:
                inputs, labels = inputs.to(self.device), labels.to(self.device)
                optimizer.zero_grad()
                optimizer.step(criterion(self.model(inputs), labels).backward())

        # Save to Memory Stream
        output_buffer = io.BytesIO()
        torch.save(self.model.state_dict(), output_buffer)
        output_buffer.seek(0)
        return output_buffer