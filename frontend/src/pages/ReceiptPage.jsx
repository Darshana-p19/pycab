import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ReceiptPage() {
  const { rideId } = useParams();
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchReceiptData();
  }, [rideId]);

  const fetchReceiptData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/receipts/${rideId}/status`);
      if (response.ok) {
        const data = await response.json();
        setReceiptData(data);
      } else {
        setMessage('Failed to load receipt data');
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      setMessage('Failed to load receipt data');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async () => {
    try {
      window.open(`http://localhost:8000/receipts/${rideId}/download`, '_blank');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      setMessage('Failed to download receipt');
    }
  };

  const sendEmailReceipt = async () => {
    try {
      setSendingEmail(true);
      const response = await fetch(`http://localhost:8000/receipts/${rideId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage(data.message);
      } else {
        setMessage('Failed to send email: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setMessage('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading receipt...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="max-w-4xl mx-auto p-6">
        <Link
          to="/rides"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6"
        >
          <span className="mr-2">←</span>
          Back to Rides
        </Link>

        <div className="bg-gray-800 rounded-xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Ride Receipt</h1>
              <p className="text-gray-400">Ride ID: {rideId}</p>
            </div>
            <div className="flex items-center space-x-4">
              {receiptData?.payment_status === 'paid' && (
                <div className="flex items-center text-green-400">
                  <span className="mr-2">✓</span>
                  <span>Payment Complete</span>
                </div>
              )}
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-lg mb-6 ${
              message.includes('Failed') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'
            }`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900/50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-white mb-4">Ride Details</h2>
              {receiptData && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-white">{receiptData.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Status:</span>
                    <span className={`font-medium ${
                      receiptData.payment_status === 'paid' ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {receiptData.payment_status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white font-bold">₹{receiptData.amount || '0.00'}</span>
                  </div>
                  {receiptData.created_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date:</span>
                      <span className="text-white">{new Date(receiptData.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-900/50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-white mb-4">Receipt Actions</h2>
              <div className="space-y-4">
                <button
                  onClick={downloadReceipt}
                  className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors"
                  disabled={!receiptData?.receipt_available}
                >
                  <span className="mr-2">📥</span>
                  Download PDF Receipt
                </button>
                
                <button
                  onClick={sendEmailReceipt}
                  className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors"
                  disabled={sendingEmail}
                >
                  <span className="mr-2">📧</span>
                  {sendingEmail ? 'Sending...' : 'Email Receipt'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Need Help?</h2>
            <p className="text-gray-400 mb-4">
              If you have any issues with your receipt or payment, please contact our support team.
            </p>
            <div className="flex space-x-4">
              <Link
                to="/contact"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Contact Support
              </Link>
              <Link
                to="/rides"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
              >
                View All Rides
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}