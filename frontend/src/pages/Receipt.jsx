import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import RideMap from '../components/RideMap';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';  // ADD THIS IMPORT

export default function RidesPage() {
 
const downloadReceipt = async (rideId) => {
  if (!user) {
    alert("Please login first");
    return;
  }

  try {
    // Show loading
    setLoading(true);
    
    // Method 1: Direct download
    const response = await fetch(`http://localhost:8000/api/receipts/${rideId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`, // Add if using auth
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download receipt');
    }

    // Create blob from response
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${rideId}.pdf`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    alert('✅ Receipt downloaded successfully!');
    
  } catch (error) {
    console.error('Receipt download error:', error);
    alert('Failed to download receipt: ' + error.message);
  } finally {
    setLoading(false);
  }
};

// Method 2: Preview in new tab
const previewReceipt = async (rideId) => {
  try {
    const response = await fetch(`http://localhost:8000/api/receipts/${rideId}/preview`);
    
    if (!response.ok) {
      throw new Error('Failed to load receipt');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Open in new tab
    window.open(url, '_blank');
    
  } catch (error) {
    console.error('Receipt preview error:', error);
    alert('Failed to preview receipt');
  }
};

// Method 3: Get as base64 and display in iframe
const viewReceiptInIframe = async (rideId) => {
  try {
    const response = await fetch(`http://localhost:8000/api/receipts/${rideId}/base64`);
    const data = await response.json();
    
    if (data.pdf_base64) {
      // Create iframe to display PDF
      const iframe = document.createElement('iframe');
      iframe.src = `data:application/pdf;base64,${data.pdf_base64}`;
      iframe.width = '100%';
      iframe.height = '600px';
      iframe.title = `Receipt for Ride ${rideId}`;
      
      // Open in modal or new tab
      const newWindow = window.open();
      newWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${rideId}</title>
            <style>
              body { margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #333; margin-bottom: 20px; }
              .actions { margin: 20px 0; display: flex; gap: 10px; }
              button { padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; }
              button:hover { background: #45a049; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📄 Ride Receipt #${rideId}</h1>
              <div class="actions">
                <button onclick="window.print()">🖨️ Print Receipt</button>
                <button onclick="downloadPDF()">📥 Download</button>
                <button onclick="window.close()">❌ Close</button>
              </div>
              ${iframe.outerHTML}
            </div>
            <script>
              function downloadPDF() {
                const a = document.createElement('a');
                a.href = 'data:application/pdf;base64,${data.pdf_base64}';
                a.download = 'receipt_${rideId}.pdf';
                a.click();
              }
            </script>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Error loading receipt:', error);
    alert('Failed to load receipt');
  }
};
}
