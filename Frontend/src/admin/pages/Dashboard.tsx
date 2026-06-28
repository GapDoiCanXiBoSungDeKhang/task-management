import { useEffect, useState } from 'react';
import {
  Card, Col, Row, Select, Statistic, Table, Tag, Typography,
  DatePicker, Space, Input, Progress, Badge,
} from 'antd';
import {
  CheckCircleOutlined, ProjectOutlined, TeamOutlined,
  SafetyOutlined, TrophyOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import dayjs from 'dayjs';
import {
  getDashboardDropdowns, getDashboardProgress, getDashboardProjectsProgress,
  getDashboardChart, getDashboardSystem,
} from '../api/dashboard';
import { TASK_STATUS_OPTIONS, PROJECT_STATUS_OPTIONS } from '../../types';

const { RangePicker } = DatePicker;

// Colors cho BarChart theo từng status
const TASK_BAR_COLORS: Record<string, string> = {
  initial: '#8c8c8c',
  doing: '#1677ff',
  finish: '#52c41a',
  pending: '#faad14',
  notFinish: '#ff4d4f',
  late: '#cf1322',
};

const PROJECT_BAR_COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1'];

export default function Dashboard() {
  const [system, setSystem] = useState<any>(null);
  const [chartTasks, setChartTasks] = useState<any[]>([]);
  const [chartProjects, setChartProjects] = useState<any[]>([]);
  const [dropdowns, setDropdowns] = useState<{ users: any[]; accounts: any[] }>({ users: [], accounts: [] });
  const [taskProgress, setTaskProgress] = useState<any[]>([]);
  const [taskPagination, setTaskPagination] = useState<any>({});
  const [projectProgress, setProjectProgress] = useState<any[]>([]);
  const [projectPagination, setProjectPagination] = useState<any>({});
  const [taskFilters, setTaskFilters] = useState<any>({ page: 1, limit: 4 });
  const [projectFilters, setProjectFilters] = useState<any>({ page: 1, limit: 4 });
  const [systemExtra, setSystemExtra] = useState<any>({});

  // Load one-time data
  useEffect(() => {
    (async () => {
      try {
        const [sysRes, chartRes, ddRes] = await Promise.all([
          getDashboardSystem(),
          getDashboardChart(),
          getDashboardDropdowns(),
        ]);

        // system: { total, initial, doing, finish, pending, notFinish, completionRate }
        setSystem(sysRes.data || {});

        // chartTask: IChart[] — per-user breakdown
        // chartProject: IProjectChart[] — per-project breakdown
        setChartTasks(chartRes.chartTask || []);
        setChartProjects(chartRes.chartProject || []);

        // dropdowns: { users, accounts }
        setDropdowns(ddRes.data || { users: [], accounts: [] });
      } catch (e) {
        console.error('Dashboard load error', e);
      }
    })();
  }, []);

  // Load task progress (filterable)
  useEffect(() => {
    getDashboardProgress(taskFilters)
      .then(res => {
        setTaskProgress(res.data || []);
        setTaskPagination(res.pagination || {});
        setSystemExtra((prev: any) => ({ ...prev, deadline: res.deadline }));
      })
      .catch(() => {});
  }, [taskFilters]);

  // Load project progress (filterable)
  useEffect(() => {
    getDashboardProjectsProgress(projectFilters)
      .then(res => {
        setProjectProgress(res.data || []);
        setProjectPagination(res.pagination || {});
      })
      .catch(() => {});
  }, [projectFilters]);

  // ── Chart data: Aggregate chartTask array → sum by status ──
  const taskStatusSummary = chartTasks.reduce(
    (acc, item) => {
      acc.initial += item.initial || 0;
      acc.doing += item.doing || 0;
      acc.finish += item.finish || 0;
      acc.pending += item.pending || 0;
      acc.notFinish += item.notFinish || 0;
      acc.late += item.late || 0;
      return acc;
    },
    { initial: 0, doing: 0, finish: 0, pending: 0, notFinish: 0, late: 0 }
  );

  const taskBarData = [
    { name: 'Chờ xử lý', value: taskStatusSummary.initial, key: 'initial' },
    { name: 'Đang làm', value: taskStatusSummary.doing, key: 'doing' },
    { name: 'Hoàn thành', value: taskStatusSummary.finish, key: 'finish' },
    { name: 'Tạm dừng', value: taskStatusSummary.pending, key: 'pending' },
    { name: 'Không xong', value: taskStatusSummary.notFinish, key: 'notFinish' },
    { name: 'Trễ hạn', value: taskStatusSummary.late, key: 'late' },
  ];

  // ── Chart data: chartProject per-project completion rates ──
  // Show top 8 projects by completionRate
  const topProjects = [...chartProjects]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const projectBarData = topProjects.map(p => ({
    name: p.title?.length > 14 ? p.title.slice(0, 14) + '…' : p.title,
    fullName: p.title,
    'Đúng hạn': p.onTime,
    'Trễ': p.late,
    'Quá hạn': p.overdue,
    'Đang chạy': p.inProgress,
  }));

  // ── Task progress columns (data shape: IProgress with createdBy) ──
  const taskProgressColumns = [
    {
      title: 'Người tạo',
      key: 'creator',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{r.createdBy?.fullName || '—'}</span>
          <span style={{ fontSize: 11, color: '#888' }}>{r.createdBy?.email || ''}</span>
          {r.createdBy?.role && (
            <Tag color={r.createdBy.role === 'admin' ? 'gold' : 'blue'} style={{ fontSize: 10 }}>
              {r.createdBy.role === 'admin' ? 'Admin' : 'User'}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Hoàn thành',
      key: 'finish',
      render: (_: any, r: any) => {
        const total = (r.initial || 0) + (r.doing || 0) + (r.finish || 0) + (r.pending || 0) + (r.notFinish || 0);
        const rate = r.completionRate ?? 0;
        return (
          <Space direction="vertical" size={4} style={{ width: '100%', minWidth: 140 }}>
            <Progress
              percent={Math.round(rate)}
              size="small"
              strokeColor={rate >= 80 ? '#52c41a' : rate >= 50 ? '#faad14' : '#ff4d4f'}
            />
            <span style={{ fontSize: 11, color: '#888' }}>
              {r.finish || 0}/{total} tasks
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Chờ xử lý',
      dataIndex: 'initial',
      render: (v: number) => <Badge count={v || 0} showZero color="#8c8c8c" />,
    },
    {
      title: 'Đang làm',
      dataIndex: 'doing',
      render: (v: number) => <Badge count={v || 0} showZero color="#1677ff" />,
    },
    {
      title: 'Trễ hạn',
      dataIndex: 'notFinish',
      render: (v: number) => <Badge count={v || 0} showZero color="#ff4d4f" />,
    },
  ];

  // ── Project progress columns (data shape: IProjectProgress) ──
  const projectProgressColumns = [
    {
      title: 'Tên dự án',
      dataIndex: 'title',
      ellipsis: true,
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: 'Tổng tasks',
      dataIndex: 'total',
      render: (v: number) => <Tag>{v}</Tag>,
    },
    {
      title: 'Đúng hạn',
      dataIndex: 'onTime',
      render: (v: number) => <Tag color="green">{v}</Tag>,
    },
    {
      title: 'Trễ',
      dataIndex: 'late',
      render: (v: number) => <Tag color="orange">{v}</Tag>,
    },
    {
      title: 'Quá hạn',
      dataIndex: 'overdue',
      render: (v: number) => <Tag color="red">{v}</Tag>,
    },
    {
      title: 'Hoàn thành',
      dataIndex: 'completionRate',
      render: (v: number) => (
        <Progress
          percent={Math.round(v || 0)}
          size="small"
          style={{ minWidth: 100 }}
          strokeColor={v >= 80 ? '#52c41a' : v >= 50 ? '#faad14' : '#ff4d4f'}
        />
      ),
    },
  ];

  const totalTasks = system?.total ?? 0;
  const totalFinish = system?.finish ?? 0;
  const completionRate = system?.completionRate ?? 0;

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>Dashboard</Typography.Title>

      {/* ── System Stats ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng Tasks"
              value={totalTasks}
              prefix={<CheckCircleOutlined style={{ color: '#1677ff' }} />}
              suffix={<span style={{ fontSize: 12, color: '#888' }}>tasks</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hoàn thành"
              value={totalFinish}
              prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
              suffix={<span style={{ fontSize: 12, color: '#888' }}>/{totalTasks}</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đang làm"
              value={system?.doing ?? 0}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              suffix={<span style={{ fontSize: 12, color: '#888' }}>tasks</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>
              <SafetyOutlined style={{ color: '#722ed1', marginRight: 6 }} />
              Tỉ lệ hoàn thành
            </div>
            <Progress
              type="circle"
              percent={Math.round(completionRate || 0)}
              size={72}
              strokeColor={completionRate >= 80 ? '#52c41a' : completionRate >= 50 ? '#faad14' : '#ff4d4f'}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Charts ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Thống kê Tasks theo trạng thái" bodyStyle={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={taskBarData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v, 'Số lượng']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {taskBarData.map((entry) => (
                    <Cell key={entry.key} fill={TASK_BAR_COLORS[entry.key] || '#1677ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Tiến độ Tasks theo Dự án (Top 8)" bodyStyle={{ paddingTop: 8 }}>
            {projectBarData.length === 0 ? (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={projectBarData} margin={{ top: 8, right: 8, left: -16, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                    formatter={(v, name) => [v, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Đúng hạn" stackId="a" fill="#52c41a" />
                  <Bar dataKey="Đang chạy" stackId="a" fill="#1677ff" />
                  <Bar dataKey="Trễ" stackId="a" fill="#faad14" />
                  <Bar dataKey="Quá hạn" stackId="a" fill="#ff4d4f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Task Progress Table ── */}
      <Card
        title="Tiến độ Tasks theo người dùng"
        style={{ marginBottom: 16 }}
        extra={
          <Space wrap size="small">
            <Input.Search
              placeholder="Tìm task"
              allowClear
              size="small"
              style={{ width: 160 }}
              onSearch={(v) => setTaskFilters((f: any) => ({ ...f, keyword: v, page: 1 }))}
            />
            <Select
              placeholder="Trạng thái"
              allowClear size="small" style={{ width: 140 }}
              onChange={(v) => setTaskFilters((f: any) => ({ ...f, status: v || undefined, page: 1 }))}
              options={TASK_STATUS_OPTIONS}
            />
            <Select
              placeholder="Người dùng"
              allowClear size="small" style={{ width: 170 }}
              onChange={(v) => setTaskFilters((f: any) => ({ ...f, userId: v || undefined, page: 1 }))}
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={[
                ...dropdowns.users.map(u => ({ value: u._id, label: u.fullName })),
                ...dropdowns.accounts.map(a => ({ value: a._id, label: `${a.fullName} (admin)` })),
              ]}
            />
            <RangePicker
              size="small"
              onChange={(dates) => {
                if (dates?.[0] && dates?.[1]) {
                  setTaskFilters((f: any) => ({
                    ...f,
                    from: dates[0]!.format('YYYY-MM-DD'),
                    to: dates[1]!.format('YYYY-MM-DD'),
                    page: 1,
                  }));
                } else {
                  setTaskFilters((f: any) => {
                    const n = { ...f }; delete n.from; delete n.to; return n;
                  });
                }
              }}
            />
          </Space>
        }
      >
        <Table
          rowKey="userId"
          dataSource={taskProgress}
          columns={taskProgressColumns}
          pagination={{
            current: taskPagination.currentPage || 1,
            pageSize: taskPagination.limit || 4,
            total: taskPagination.totalItems || 0,
            showTotal: (t) => `Tổng ${t} người dùng`,
            onChange: (p) => setTaskFilters((f: any) => ({ ...f, page: p })),
          }}
          size="small"
          scroll={{ x: 600 }}
        />
      </Card>

      {/* ── Project Progress Table ── */}
      <Card
        title="Tiến độ Dự án"
        extra={
          <Space wrap size="small">
            <Input.Search
              placeholder="Tìm dự án"
              allowClear size="small" style={{ width: 160 }}
              onSearch={(v) => setProjectFilters((f: any) => ({ ...f, keyword: v, page: 1 }))}
            />
            <Select
              placeholder="Trạng thái"
              allowClear size="small" style={{ width: 140 }}
              onChange={(v) => setProjectFilters((f: any) => ({ ...f, status: v || undefined, page: 1 }))}
              options={PROJECT_STATUS_OPTIONS}
            />
            <RangePicker
              size="small"
              onChange={(dates) => {
                if (dates?.[0] && dates?.[1]) {
                  setProjectFilters((f: any) => ({
                    ...f,
                    from: dates[0]!.format('YYYY-MM-DD'),
                    to: dates[1]!.format('YYYY-MM-DD'),
                    page: 1,
                  }));
                } else {
                  setProjectFilters((f: any) => {
                    const n = { ...f }; delete n.from; delete n.to; return n;
                  });
                }
              }}
            />
          </Space>
        }
      >
        <Table
          rowKey="projectId"
          dataSource={projectProgress}
          columns={projectProgressColumns}
          pagination={{
            current: projectPagination.currentPage || 1,
            pageSize: projectPagination.limit || 4,
            total: projectPagination.totalItems || 0,
            showTotal: (t) => `Tổng ${t} dự án`,
            onChange: (p) => setProjectFilters((f: any) => ({ ...f, page: p })),
          }}
          size="small"
          scroll={{ x: 600 }}
        />
      </Card>
    </div>
  );
}
