import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  DatePicker,
  Select,
  Input,
  Modal,
  Descriptions,
  Alert,
  Spin,
  Timeline,
  Progress
} from 'antd';
import {
  CarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  AreaChartOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

const RealAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    payment_status: 'all',
    dateRange: null,
    search: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:8000/admin/stats', {
        headers: {
          'X-Admin-Token': token,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRides = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      let url = `http://localhost:8000/admin/rides?limit=${pageSize}&offset=${(page - 1) * pageSize}`;
      
      // Add filters
      if (filters.status !== 'all') {
        url += `&status=${filters.status}`;
      }
      if (filters.payment_status !== 'all') {
        url += `&payment_status=${filters.payment_status}`;
      }
      if (filters.search) {
        url += `&search=${encodeURIComponent(filters.search)}`;
      }
      if (filters.dateRange) {
        const [start, end] = filters.dateRange;
        url += `&start_date=${start.format('YYYY-MM-DD')}&end_date=${end.format('YYYY-MM-DD')}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'X-Admin-Token': token,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRides(data);
        setPagination(prev => ({
          ...prev,
          total: data.length,
          current: page
        }));
      }
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format = 'json') => {
    try {
      setExportLoading(true);
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`http://localhost:8000/admin/export?format=${format}`, {
        headers: {
          'X-Admin-Token': token
        }
      });
      
      if (response.ok) {
        if (format === 'csv') {
          const data = await response.json();
          const blob = new Blob([data.content], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.filename;
          a.click();
          window.URL.revokeObjectURL(url);
        } else {
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `rides_export_${moment().format('YYYYMMDD_HHmmss')}.json`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const updateRideStatus = async (rideId, newStatus) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`http://localhost:8000/admin/rides/${rideId}/status`, {
        method: 'PATCH',
        headers: {
          'X-Admin-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        Alert.success('Status updated successfully!');
        fetchRides(pagination.current, pagination.pageSize);
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.error('Failed to update status');
    }
  };

  const updatePaymentStatus = async (rideId, newStatus) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`http://localhost:8000/admin/rides/${rideId}/payment-status`, {
        method: 'PATCH',
        headers: {
          'X-Admin-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payment_status: newStatus })
      });
      
      if (response.ok) {
        Alert.success('Payment status updated!');
        fetchRides(pagination.current, pagination.pageSize);
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      Alert.error('Failed to update payment status');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRides();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const columns = [
    {
      title: 'Ride ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: 'User',
      dataIndex: 'user_email',
      key: 'user',
      render: (email, record) => (
        <div>
          <div><UserOutlined /> {email}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.user_name}</div>
        </div>
      )
    },
    {
      title: 'Pickup',
      dataIndex: 'pickup_address',
      key: 'pickup',
      ellipsis: true
    },
    {
      title: 'Drop',
      dataIndex: 'drop_address',
      key: 'drop',
      ellipsis: true
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (record) => (
        <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
          <DollarOutlined /> ₹{record.actual_price || record.estimated_price}
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const statusColors = {
          requested: 'blue',
          driver_assigned: 'cyan',
          in_progress: 'orange',
          completed: 'green',
          cancelled: 'red'
        };
        return (
          <Space direction="vertical" size={2}>
            <Tag color={statusColors[status] || 'default'}>
              {status?.toUpperCase()}
            </Tag>
            <Tag color={record.payment_status === 'paid' ? 'green' : 'orange'}>
              {record.payment_status?.toUpperCase()}
            </Tag>
          </Space>
        );
      }
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'date',
      render: (date) => (
        <div>
          {date ? moment(date).format('MMM D, YYYY') : 'N/A'}
          <div style={{ fontSize: '12px', color: '#666' }}>
            {date ? moment(date).format('HH:mm') : ''}
          </div>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              fetchRideDetails(record.id);
            }}
          >
            View
          </Button>
        </Space>
      )
    }
  ];

  const fetchRideDetails = async (rideId) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`http://localhost:8000/admin/rides/${rideId}`, {
        headers: {
          'X-Admin-Token': token,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedRide(data);
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Error fetching ride details:', error);
    }
  };

  const handleTableChange = (pagination, filters, sorter) => {
    fetchRides(pagination.current, pagination.pageSize);
  };

  if (loading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 20 }}>Loading real data from database...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>
          <CarOutlined /> PyCab Admin Dashboard
        </h1>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchStats();
              fetchRides();
            }}
          >
            Refresh
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={exportLoading}
            onClick={() => exportData('csv')}
          >
            Export CSV
          </Button>
        </Space>
      </div>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Rides"
                value={stats.summary?.total_rides || 0}
                prefix={<CarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Today's Rides"
                value={stats.summary?.today_rides || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Today's Revenue"
                value={stats.revenue?.today_revenue || 0}
                prefix={<DollarOutlined />}
                suffix="₹"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Completion Rate"
                value={stats.summary?.completion_rate || 0}
                suffix="%"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Revenue Summary */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card title="Total Revenue">
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>
                ₹{stats.revenue?.total_revenue?.toLocaleString() || '0'}
              </div>
              <div style={{ color: '#666', marginTop: 8 }}>
                Average per ride: ₹{stats.revenue?.average_ride_value || '0'}
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Weekly Revenue">
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>
                ₹{stats.revenue?.weekly_revenue?.toLocaleString() || '0'}
              </div>
              <div style={{ color: '#666', marginTop: 8 }}>
                Last 7 days
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Ride Status">
              <Row gutter={8}>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                      {stats.summary?.completed_rides || 0}
                    </div>
                    <div>Completed</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                      {stats.summary?.active_rides || 0}
                    </div>
                    <div>Active</div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Select
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => {
                setFilters({ ...filters, status: value });
                fetchRides(1, pagination.pageSize);
              }}
            >
              <Option value="all">All Status</Option>
              <Option value="requested">Requested</Option>
              <Option value="driver_assigned">Driver Assigned</Option>
              <Option value="in_progress">In Progress</Option>
              <Option value="completed">Completed</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Select
              style={{ width: '100%' }}
              value={filters.payment_status}
              onChange={(value) => {
                setFilters({ ...filters, payment_status: value });
                fetchRides(1, pagination.pageSize);
              }}
            >
              <Option value="all">All Payments</Option>
              <Option value="pending">Pending</Option>
              <Option value="paid">Paid</Option>
              <Option value="failed">Failed</Option>
              <Option value="refunded">Refunded</Option>
            </Select>
          </Col>
          <Col span={8}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(dates) => {
                setFilters({ ...filters, dateRange: dates });
                if (dates) {
                  fetchRides(1, pagination.pageSize);
                }
              }}
            />
          </Col>
          <Col span={4}>
            <Search
              placeholder="Search rides..."
              onSearch={(value) => {
                setFilters({ ...filters, search: value });
                fetchRides(1, pagination.pageSize);
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* Rides Table */}
      <Card
        title={
          <div>
            <CarOutlined /> Recent Rides
            <span style={{ marginLeft: 8, fontSize: 14, color: '#666' }}>
              (Total: {pagination.total})
            </span>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={rides}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} rides`
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* Recent Activity */}
      {stats?.recent_activities && stats.recent_activities.length > 0 && (
        <Card title="Recent Activity" style={{ marginTop: 24 }}>
          <Timeline>
            {stats.recent_activities.map((activity, index) => (
              <Timeline.Item
                key={index}
                color={
                  activity.status === 'completed' ? 'green' :
                  activity.status === 'cancelled' ? 'red' :
                  activity.status === 'in_progress' ? 'orange' : 'blue'
                }
              >
                <div>
                  <strong>Ride #{activity.id}</strong> - {activity.user_id}
                  <div>
                    Status: <Tag color={
                      activity.status === 'completed' ? 'success' :
                      activity.status === 'cancelled' ? 'error' :
                      activity.status === 'in_progress' ? 'warning' : 'processing'
                    }>
                      {activity.status}
                    </Tag>
                    Amount: <strong>₹{activity.amount}</strong>
                    <span style={{ marginLeft: 16, color: '#666' }}>
                      {activity.time}
                    </span>
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      )}

      {/* Ride Details Modal */}
      <Modal
        title={`Ride Details - #${selectedRide?.id}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedRide && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Ride ID" span={2}>
                <strong>#{selectedRide.id}</strong>
              </Descriptions.Item>
              
              <Descriptions.Item label="User Information">
                <div>
                  <div><UserOutlined /> {selectedRide.user_id}</div>
                  {selectedRide.user_details && (
                    <div style={{ marginTop: 8 }}>
                      <div>Name: {selectedRide.user_details.first_name} {selectedRide.user_details.last_name}</div>
                      <div>Email: {selectedRide.user_details.email}</div>
                      <div>Role: {selectedRide.user_details.role}</div>
                    </div>
                  )}
                </div>
              </Descriptions.Item>
              
              <Descriptions.Item label="Status">
                <Space>
                  <Tag color={
                    selectedRide.status === 'completed' ? 'success' :
                    selectedRide.status === 'cancelled' ? 'error' :
                    selectedRide.status === 'in_progress' ? 'warning' : 'processing'
                  }>
                    {selectedRide.status?.toUpperCase()}
                  </Tag>
                  <Tag color={selectedRide.payment_status === 'paid' ? 'success' : 'warning'}>
                    {selectedRide.payment_status?.toUpperCase()}
                  </Tag>
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="Pickup Location">
                <div>{selectedRide.pickup_address}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  Coordinates: {selectedRide.pickup_lat}, {selectedRide.pickup_lng}
                </div>
              </Descriptions.Item>
              
              <Descriptions.Item label="Drop Location">
                <div>{selectedRide.drop_address}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  Coordinates: {selectedRide.drop_lat}, {selectedRide.drop_lng}
                </div>
              </Descriptions.Item>
              
              <Descriptions.Item label="Distance">
                {selectedRide.actual_distance_km || selectedRide.estimated_distance_km} km
              </Descriptions.Item>
              
              <Descriptions.Item label="Price">
                <div>
                  <div>Estimated: ₹{selectedRide.estimated_price}</div>
                  <div>Final: ₹{selectedRide.final_price || selectedRide.estimated_price}</div>
                </div>
              </Descriptions.Item>
              
              <Descriptions.Item label="Driver ID">
                {selectedRide.driver_id || 'Not assigned'}
              </Descriptions.Item>
              
              <Descriptions.Item label="Payment ID">
                {selectedRide.payment_intent_id || 'N/A'}
              </Descriptions.Item>
              
              <Descriptions.Item label="Created At">
                {selectedRide.created_at ? moment(selectedRide.created_at).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
              </Descriptions.Item>
              
              <Descriptions.Item label="Completed At">
                {selectedRide.completed_at ? moment(selectedRide.completed_at).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
              </Descriptions.Item>
            </Descriptions>
            
            {/* Rating Section */}
            {selectedRide.can_rate && (
              <div style={{ marginTop: 20, padding: 16, backgroundColor: '#f6ffed', borderRadius: 8 }}>
                <h4>Rating Information</h4>
                {selectedRide.rating_details ? (
                  <div>
                    <p>This ride has been rated!</p>
                    <div style={{ marginTop: 8 }}>
                      <strong>Rating:</strong> {selectedRide.rating_details.rating}/5
                      {selectedRide.rating_details.review && (
                        <div style={{ marginTop: 4 }}>
                          <strong>Review:</strong> {selectedRide.rating_details.review}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p>This ride is eligible for rating!</p>
                    <Button
                      type="primary"
                      href={`/rate/${selectedRide.id}`}
                      target="_blank"
                      style={{ marginTop: 8 }}
                    >
                      View Rating Page
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Actions */}
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <Button
                type="primary"
                onClick={() => {
                  if (selectedRide.status !== 'completed') {
                    updateRideStatus(selectedRide.id, 'completed');
                  }
                }}
                disabled={selectedRide.status === 'completed'}
              >
                Mark as Completed
              </Button>
              
              <Button
                onClick={() => {
                  if (selectedRide.payment_status !== 'paid') {
                    updatePaymentStatus(selectedRide.id, 'paid');
                  }
                }}
                disabled={selectedRide.payment_status === 'paid'}
              >
                Mark as Paid
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RealAdminDashboard;