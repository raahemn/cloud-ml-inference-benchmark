import { useState } from 'react';

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle file selection and generate a preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null); // Clear previous results
    }
  };

  // Submit image to the ML API
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', image); // 'file' is the common key name for ML APIs

    try {
      // Replace with your actual API endpoint
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      // Assuming your API returns { "label": "Golden Retriever" }
      setResult(data.label); 
    } catch (error) {
      console.error("Error classifying image:", error);
      setResult("Error processing image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-6">ML Image Classifier</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          {preview && (
            <div className="mt-4">
              <img src={preview} alt="Preview" className="mx-auto h-48 w-full object-cover rounded-lg border" />
            </div>
          )}

          <button 
            type="submit" 
            disabled={!image || loading}
            className={`w-full py-2 px-4 rounded-lg font-medium text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Classifying...' : 'Submit Image'}
          </button>
        </form>

        {result && (
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600 uppercase font-bold tracking-wider">Result:</p>
            <p className="text-xl font-semibold text-gray-800">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;