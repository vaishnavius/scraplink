import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, Download, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { format } from 'date-fns';

interface DatasetUpload {
  upload_id: string;
  filename: string;
  upload_date: string;
  uploaded_by: string;
  file_size: number;
  records_processed: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  dataset_type: string;
}

interface MetalPrice {
  metal_type: string;
  current_price: number;
  last_updated: string;
  data_source: string;
}

export function DatasetManagement() {
  const [uploads, setUploads] = useState<DatasetUpload[]>([]);
  const [currentPrices, setCurrentPrices] = useState<MetalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch dataset uploads
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('dataset_uploads')
        .select('*')
        .order('upload_date', { ascending: false });

      if (uploadsError) throw uploadsError;

      // Fetch current prices
      const { data: pricesData, error: pricesError } = await supabase
        .from('metal_prices')
        .select('*')
        .order('last_updated', { ascending: false });

      if (pricesError) throw pricesError;

      setUploads(uploadsData || []);
      setCurrentPrices(pricesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['text/csv', 'application/json', 'application/vnd.ms-excel'];
      if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
        alert('Please select a CSV or JSON file');
        return;
      }
      setSelectedFile(file);
    }
  };

  const processCSVData = (csvText: string): any[] => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Expected headers: metal_type, price, date, location, source
    const requiredHeaders = ['metal_type', 'price'];
    const hasRequiredHeaders = requiredHeaders.every(header => 
      headers.some(h => h.includes(header.replace('_', '')))
    );

    if (!hasRequiredHeaders) {
      throw new Error('CSV must contain at least metal_type and price columns');
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 2 && values[0] && values[1]) {
        const record: any = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            record[header] = values[index];
          }
        });
        data.push(record);
      }
    }

    return data;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Read file content
      const fileContent = await selectedFile.text();
      let processedData: any[] = [];

      // Process based on file type
      if (selectedFile.name.endsWith('.csv') || selectedFile.type === 'text/csv') {
        processedData = processCSVData(fileContent);
      } else if (selectedFile.type === 'application/json') {
        processedData = JSON.parse(fileContent);
      }

      // Create upload record
      const { data: uploadRecord, error: uploadError } = await supabase
        .from('dataset_uploads')
        .insert({
          filename: selectedFile.name,
          uploaded_by: 'admin',
          file_size: selectedFile.size,
          processing_status: 'processing',
          dataset_type: 'price_data',
        })
        .select()
        .single();

      if (uploadError) throw uploadError;

      // Process and insert price data
      let successCount = 0;
      for (const record of processedData) {
        try {
          const metalType = record.metal_type || record.metaltype || record.metal;
          const price = parseFloat(record.price || record.current_price || record.rate);
          
          if (metalType && !isNaN(price)) {
            // Update current price
            await supabase
              .from('metal_prices')
              .upsert({
                metal_type: metalType,
                current_price: price,
                data_source: selectedFile.name,
                market_location: record.location || record.market || 'India',
              });

            // Add to price history
            await supabase
              .from('price_history')
              .insert({
                metal_type: metalType,
                price: price,
                data_source: selectedFile.name,
                market_location: record.location || record.market || 'India',
                price_date: record.date ? new Date(record.date).toISOString() : new Date().toISOString(),
              });

            successCount++;
          }
        } catch (error) {
          console.error('Error processing record:', record, error);
        }
      }

      // Update upload record
      await supabase
        .from('dataset_uploads')
        .update({
          processing_status: 'completed',
          records_processed: successCount,
        })
        .eq('upload_id', uploadRecord.upload_id);

      alert(`Successfully processed ${successCount} records from ${selectedFile.name}`);
      setSelectedFile(null);
      fetchData();
    } catch (error) {
      console.error('Error uploading dataset:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    if (!confirm('Are you sure you want to delete this upload record?')) return;

    try {
      const { error } = await supabase
        .from('dataset_uploads')
        .delete()
        .eq('upload_id', uploadId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting upload:', error);
      alert('Failed to delete upload record');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <LoadingSpinner size="sm" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dataset Management</h1>
          <p className="text-gray-600 mt-2">
            Upload and manage external datasets for real-time price predictions
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload New Dataset</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="mb-4">
                <label className="cursor-pointer">
                  <span className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Choose File
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.json"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
              
              {selectedFile && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-blue-900">{selectedFile.name}</p>
                  <p className="text-sm text-blue-600">{formatFileSize(selectedFile.size)}</p>
                </div>
              )}
              
              <p className="text-sm text-gray-600 mb-4">
                Upload CSV or JSON files with metal price data. Required columns: metal_type, price
              </p>
              
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
              >
                {uploading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  'Upload Dataset'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Current Prices */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Market Prices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentPrices.map((price) => (
              <div key={price.metal_type} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900">{price.metal_type}</h3>
                <p className="text-2xl font-bold text-green-600">₹{price.current_price.toFixed(2)}/kg</p>
                <p className="text-sm text-gray-600">
                  Updated: {format(new Date(price.last_updated), 'MMM dd, yyyy HH:mm')}
                </p>
                <p className="text-xs text-gray-500">Source: {price.data_source}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upload History */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload History</h2>
          
          {uploads.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No datasets uploaded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Records
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploads.map((upload) => (
                    <tr key={upload.upload_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {upload.filename}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatFileSize(upload.file_size)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(upload.processing_status)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {upload.processing_status}
                          </span>
                        </div>
                        {upload.error_message && (
                          <p className="text-xs text-red-600 mt-1">{upload.error_message}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {upload.records_processed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(upload.upload_date), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteUpload(upload.upload_id)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}