import { useState } from 'react';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000';

function App() {
  const [viewMode, setViewMode] = useState('predict'); // 'predict' or 'submit'
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // New state for UI feedback
  const [labelInput, setLabelInput] = useState('');

  // Helper to process the file (shared by input and drag-and-drop)
  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handlePredictSubmit = async (e) => {
    e.preventDefault();
    if (!image) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', image);

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error processing image.');
      }
      setResult({ type: 'success', text: data.label }); 
    } catch (error) {
      console.error("Error classifying image:", error);
      setResult({ type: 'error', text: error.message || "Error processing image." });
    } finally {
      setLoading(false);
    }
  };

  const handleDataSubmit = async (e) => {
    e.preventDefault();
    if (!image || !labelInput) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', image);
    formData.append('label', labelInput);

    try {
      const response = await fetch(`${API_BASE_URL}/submit_data`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error submitting data.');
      }
      setResult({ type: 'success', text: data.message || 'Successfully submitted data!' });
      setLabelInput('');
      setImage(null);
      setPreview(null);
    } catch (error) {
      console.error("Error submitting data:", error);
      setResult({ type: 'error', text: error.message || "Error submitting data." });
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (newMode) => {
    if (viewMode === newMode) return;
    setViewMode(newMode);
    setImage(null);
    setPreview(null);
    setResult(null);
    setLabelInput('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col items-center justify-center p-4 sm:p-8 font-sans selection:bg-blue-500 selection:text-white">
      <div className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-[2rem] shadow-2xl border border-white/20 w-full max-w-md text-center transition-all duration-500">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 text-left mr-2 tracking-tight">
            {viewMode === 'predict' ? 'ML Classifier' : 'Submit Data'}
          </h1>
          <div className="flex bg-gray-100/80 p-1.5 rounded-xl shrink-0 shadow-inner border border-gray-200/50">
            <button
               type="button"
               onClick={() => handleViewChange('predict')}
               className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap ${viewMode === 'predict' ? 'bg-white shadow-sm text-blue-700 scale-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 scale-95 hover:scale-100'}`}
            >
              Predict
            </button>
            <button
               type="button"
               onClick={() => handleViewChange('submit')}
               className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap ${viewMode === 'submit' ? 'bg-white shadow-sm text-blue-700 scale-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 scale-95 hover:scale-100'}`}
            >
              Train
            </button>
          </div>
        </div>
        
        <form onSubmit={viewMode === 'predict' ? handlePredictSubmit : handleDataSubmit} className="space-y-6">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`group relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ease-in-out ${
              isDragging 
                ? 'border-blue-500 bg-blue-50/80 scale-[1.02] shadow-inner' 
                : 'border-gray-300 bg-gray-50/50 hover:bg-blue-50/50 hover:border-blue-400'
            }`}
          >
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            <div className="flex flex-col items-center pointer-events-none">
              <svg className={`w-12 h-12 mb-4 transition-colors duration-300 transform group-hover:scale-110 ${isDragging ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="mb-2 text-sm text-gray-600">
                <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400 font-medium">PNG, JPG or WEBP (max. 10MB)</p>
            </div>
          </div>

          {preview && (
            <div className="mt-4 transition-all duration-500">
              <img src={preview} alt="Preview" className="mx-auto h-56 w-full object-cover rounded-2xl shadow-md ring-1 ring-black/5" />
            </div>
          )}

          {viewMode === 'submit' && (
            <div className="mt-4 text-left transition-all duration-500 relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Image Label</label>
              <select
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-all duration-200 cursor-pointer shadow-sm text-gray-700 font-medium appearance-none"
                required
              >
                <option value="" disabled>Select an image label...</option>
                <option value="airplane">✈️ Airplane</option>
                <option value="automobile">🚗 Automobile</option>
                <option value="bird">🐦 Bird</option>
                <option value="cat">🐱 Cat</option>
                <option value="deer">🦌 Deer</option>
                <option value="dog">🐶 Dog</option>
                <option value="frog">🐸 Frog</option>
                <option value="horse">🐴 Horse</option>
                <option value="ship">🚢 Ship</option>
                <option value="truck">🚚 Truck</option>
              </select>
              {/* Custom dropdown arrow */}
              <div className="pointer-events-none absolute inset-y-0 right-0 top-7 flex items-center px-4 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={!image || loading || (viewMode === 'submit' && !labelInput)}
            className={`relative w-full py-4 px-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 overflow-hidden ${
              (!image || loading || (viewMode === 'submit' && !labelInput)) 
                ? 'bg-gray-300 cursor-not-allowed shadow-none text-gray-500' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {viewMode === 'predict' ? 'Classifying...' : 'Submitting...'}
              </span>
            ) : (
              viewMode === 'predict' ? 'Submit Image' : 'Upload Data'
            )}
            
            {/* Glossy overlay effect for enabled state */}
            {image && !loading && (viewMode === 'predict' || (viewMode === 'submit' && labelInput)) && (
               <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"></div>
            )}
          </button>
        </form>

        {result && (
          <div className={`mt-8 p-5 rounded-2xl border shadow-sm transition-all duration-500 ${
            result.type === 'error' ? 'bg-red-50/80 border-red-100' : 'bg-green-50/80 border-green-100'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {result.type === 'error' ? (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              <p className={`text-sm uppercase font-bold tracking-widest ${result.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {result.type === 'error' ? 'Error' : 'Result'}
              </p>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2 capitalize">{result.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
