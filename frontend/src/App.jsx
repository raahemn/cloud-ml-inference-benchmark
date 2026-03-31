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
      const response = await fetch(`${API_BASE_URL}/training`, {
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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        
        {/* Prominent Branding Header */}
        <div className="mb-10 text-center flex flex-col items-center">
           <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-blue-100/90 border border-blue-300 text-blue-800 text-sm sm:text-base font-extrabold uppercase tracking-wider mb-5 shadow-lg">
    <span className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-blue-600 animate-pulse"></span>
    CMPT 756
  </div>
           
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-4 mb-3">
             <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg border border-blue-400 text-white transform -rotate-6 hover:rotate-0 transition-transform duration-300">
               <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
             </div>
             Group 16
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-sm">
            Cloud ML Inference Benchmark
          </p>
        </div>

        {/* Interactive App Card */}
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 w-full max-w-md text-center transition-all duration-300">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 text-left mr-2 tracking-tight">
            {viewMode === 'predict' ? 'ML Classifier' : 'Submit Data'}
          </h1>
          <div className="flex bg-slate-100 p-1 rounded-lg shrink-0 border border-slate-200">
            <button
               type="button"
               onClick={() => handleViewChange('predict')}
               className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap ${viewMode === 'predict' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-600 hover:text-slate-900 border border-transparent'}`}
            >
              Predict
            </button>
            <button
               type="button"
               onClick={() => handleViewChange('submit')}
               className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap ${viewMode === 'submit' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-600 hover:text-slate-900 border border-transparent'}`}
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
            className={`group relative border-2 border-dashed rounded-xl p-8 transition-colors duration-200 ease-in-out ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
            }`}
          >
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            <div className="flex flex-col items-center pointer-events-none">
              <svg className={`w-10 h-10 mb-3 transition-colors duration-200 ${isDragging ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="mb-1 text-sm text-slate-600">
                <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-slate-500">PNG, JPG or WEBP (max. 10MB)</p>
            </div>
          </div>

          {preview && (
            <div className="mt-4">
              <img src={preview} alt="Preview" className="mx-auto h-56 w-full object-cover rounded-xl shadow-sm border border-slate-200" />
            </div>
          )}

          {viewMode === 'submit' && (
            <div className="mt-4 text-left relative">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Image Label</label>
              <div className="relative">
                <select
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-slate-700 text-sm appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled>Select an image label...</option>
                  <option value="airplane">Airplane</option>
                  <option value="automobile">Automobile</option>
                  <option value="bird">Bird</option>
                  <option value="cat">Cat</option>
                  <option value="deer">Deer</option>
                  <option value="dog">Dog</option>
                  <option value="frog">Frog</option>
                  <option value="horse">Horse</option>
                  <option value="ship">Ship</option>
                  <option value="truck">Truck</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={!image || loading || (viewMode === 'submit' && !labelInput)}
            className={`w-full py-2.5 px-4 rounded-lg font-medium text-white transition-colors duration-200 ${
              (!image || loading || (viewMode === 'submit' && !labelInput)) 
                ? 'bg-slate-300 cursor-not-allowed text-slate-500' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 shadow-sm'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {viewMode === 'predict' ? 'Classifying...' : 'Submitting...'}
              </span>
            ) : (
              viewMode === 'predict' ? 'Submit Image' : 'Upload Data'
            )}
          </button>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded-lg border flex flex-col items-center ${
            result.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {result.type === 'error' ? (
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              )}
              <span className={`text-xs font-semibold uppercase tracking-wide ${result.type === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
                {result.type === 'error' ? 'Error' : 'Result'}
              </span>
            </div>
            <p className="text-lg font-semibold capitalize mt-1">{result.text}</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default App;
