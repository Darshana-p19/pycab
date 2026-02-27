import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Modal, Form, Select, Input, DatePicker, Alert } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import moment from 'moment';

const { RangePicker } = DatePicker;

const RealRideManagement = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchRides = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:8000/admin/rides', {
        headers: {
          'X-Admin-Token': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRides(data);
      }
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: 'User',
      dataIndex: 'user_email',
      key: 'user'
    },
    {
      title: 'From',
      dataIndex: 'pickup_address',
      key: 'from'
    },
    {
      title: 'To',
      dataIndex: 'drop_address',
      key: 'to'
    },
    {
      title: 'Amount',
      dataIndex: 'estimated_price',
      key: 'amount',
      render: (price) => `₹${price}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = status === 'completed' ? 'green' : status === 'cancelled' ? 'red' : 'blue';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Payment',
      dataIndex: 'payment_status',
      key: 'payment',
      render: (status) => {
        let color = status === 'paid' ? 'green' : status === 'failed' ? 'red' : 'orange';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm')
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Input
            placeholder="Search rides..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Filter by status"
            style={{ width: 150 }}
            allowClear
          >
            <Select.Option value="completed">Completed</Select.Option>
            <Select.Option value="in_progress">In Progress</Select.Option>
            <Select.Option value="cancelled">Cancelled</Select.Option>
          </Select>
          <RangePicker />
          <Button type="primary">Search</Button>
        </Space>
        
        <Button onClick={fetchRides}>Refresh</Button>
      </div>
      
      <Alert
        message="Real Data from Database"
        description="All rides shown here are fetched directly from your PostgreSQL database via SQLModel."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Table
        columns={columns}
        dataSource={rides}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} rides`
        }}
      />
    </div>
  );
};

export default RealRideManagement;