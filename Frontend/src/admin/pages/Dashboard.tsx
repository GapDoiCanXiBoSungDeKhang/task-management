import { useEffect, useState } from 'react';
import {
  Card, Col, Row, Select, Statistic, Table, Tag, Typography,
  DatePicker, Space, Input, Progress, Badge,
} from 'antd';
import {
  CheckCircleOutlined, TrophyOutlined, ClockCircleOutlined,
  PauseCircleOutlined, CloseCircleOutlined, HourglassOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import {
  getDashboardDropdowns, getDashboardProgress, getDashboardProjectsProgress,
  getDashboardChart, getDashboardSystem,
} from '../api/dashboard';
import { PROJECT_STATUS_OPTIONS } from '../../types';

const { RangePicker } = DatePicker;

/**
 * Backend pagination helper (helpers/pagination.ts) only returns:
 *   { page, limit, totalPage, skip }
 * There is NO totalItems / currentPage field anywhere in the API.
 * We approximate the antd Table "total" prop as totalPage * limit.
 */
function tableTotal(p: any): number {
  // Backend now returns an exact totalItems field; fall back to the
  // totalPage*limit approximation for safety if an older API build is hit.
  if (typeof p?.totalItems === 'number') return p.totalItems;
  return (p?.totalPage || 1) * (p?.limit || 4);
}
function tableCurrent(p: any): number {
  return p?.page || 1;
}
function tablePageSize(p: any): number {
  return p?.limit || 4;
}

export default function Dashboard() {
  const [system, setSystem] = useState<any>(null);
  const [chartTasks, setChartTasks] = useState<any[]>([]);
  const [chartProjects, setChartProjects] = useState<any[]>([]);
  const [dropdowns, setDropdowns] = useState<{ users: any[]; accounts: any[] }>({ users: [], accounts: [] });
  const [taskProgress, setTaskProgress] = useState<any[]>([]);
  const [taskPagination, setTaskPagination] = useState<any>({});
  const [deadline, setDeadline] = useState<any>(null);
  const [projectProgress, setProjectProgress] = useState<any[]>([]);
  const [projectPagination, setProjectPagination] = useState<any>({});
  const [taskFilters, setTaskFilters] = useState<any>({ page: 1, limit: 4 });
  const [projectFilters, setProjectFilters] = useState<any>({ page: 1, limit: 4 });

  // Load one-time (unfiltered / unpaginated) data
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

        // chartTask: IChart[] — per-user breakdown (NOT per-status totals)
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

  // Load task progress (filterable by user, paginated by user)
  useEffect(() => {
    getDashboardProgress(taskFilters)
      .then(res => {
        setTaskProgress(res.data || []);
        setTaskPagination(res.pagination || {});
        // deadline is a GLOBAL, unfiltered summary across ALL tasks,
        // returned alongside every /dashboard/progress response
        setDeadline(res.deadline || null);
      })
      .catch(() => {});
  }, [taskFilters]);

  // Load project progress (filterable, paginated by project — 1 row = 1 project, no mismatch)
  useEffect(() => {
    getDashboardProjectsProgress(projectFilters)
      .then(res => {
        setProjectProgress(res.data || []);
        setProjectPagination(res.pagination || {});
      })
      .catch(() => {});
  }, [projectFilters]);

  // ── Chart: Tasks theo Người dùng (Top 8) — mirrors chartTask's real intent ──
  const totalOfUser = (u: any) =>
    (u.initial || 0) + (u.doing || 0) + (u.finish || 0) + (u.pending || 0) + (u.notFinish || 0);

  const topUsers = [...chartTasks]
    .sort((a, b) => totalOfUser(b) - totalOfUser(a))
    .slice(0, 8);

  const userBarData = topUsers.map((u) => ({
    name: u.fullName?.length > 12 ? u.fullName.slice(0, 12) + '…' : u.fullName,
    fullName: u.fullName,
    'Chờ xử lý': u.initial,
    'Đang làm': u.doing,
    'Hoàn thành': u.finish,
    'Tạm dừng': u.pending,
    'Không xong': u.notFinish,
    'Trễ hạn': u.late,
  }));

  // ── Chart: Tasks theo Dự án (Top 8) — chartProject ──
  const topProjects = [...chartProjects]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const projectBarData = topProjects.map((p) => ({
    name: p.title?.length > 14 ? p.title.slice(0, 14) + '…' : p.title,
    fullName: p.title,
    'Đúng hạn': p.onTime,
    'Trễ': p.late,
    'Quá hạn': p.overdue,
    'Đang chạy': p.inProgress,
  }));

  // ── Task progress columns (IProgress: userId, initial, doing, finish, pending, notFinish, completionRate, createdBy) ──
  const taskProgressColumns = [
    {
      title: 'Người tạo',
      key: 'creator',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{r.createdBy?.fullName || '—'}</span>
          <span style={{ fontSize: 11, color: '#888' }}>{r.createdBy?.email || ''}</span>
          <Space size={4}>
            {r.createdBy?.role && (
              <Tag color={r.createdBy.role === 'admin' ? 'gold' : 'blue'} style={{ fontSize: 10 }}>
                {r.createdBy.role === 'admin' ? 'Admin' : 'User'}
              </Tag>
            )}
            {r.createdBy?.phone && (
              <span style={{ fontSize: 11, color: '#888' }}>{r.createdBy.phone}</span>
            )}
          </Space>
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
      title: 'Tạm dừng',
      dataIndex: 'pending',
      render: (v: number) => <Badge count={v || 0} showZero color="#faad14" />,
    },
    {
      title: 'Trễ / Quá hạn',
      dataIndex: 'notFinish',
      render: (v: number) => <Badge count={v || 0} showZero color="#ff4d4f" />,
    },
  ];

  // ── Project progress columns (IProjectProgress: total, onTime, late, overdue, inProgress, completionRate) ──
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
      title: 'Đang chạy',
      dataIndex: 'inProgress',
      render: (v: number) => <Tag color="blue">{v}</Tag>,
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

  // system: { total, initial, doing, finish, pending, notFinish, completionRate } — 7 fields, all shown below
  const s = system || {};

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>Dashboard</Typography.Title>

      {/* ── System Stats — tất cả 7 giá trị backend trả về ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="Tổng Tasks"
              value={s.total ?? 0}
              prefix={<CheckCircleOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="Chờ xử lý"
              value={s.initial ?? 0}
              prefix={<HourglassOutlined style={{ color: '#8c8c8c' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="Đang làm"
              value={s.doing ?? 0}
              prefix={<ClockCircleOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="Tạm dừng"
              value={s.pending ?? 0}
              prefix={<PauseCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="Hoàn thành"
              value={s.finish ?? 0}
              prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
              suffix={<span style={{ fontSize: 12, color: '#888' }}>/{s.total ?? 0}</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="Không xong"
              value={s.notFinish ?? 0}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={12}>
          <Card>
            <Space align="center" size={16}>
              <Progress
                type="circle"
                percent={Math.round(s.completionRate || 0)}
                size={64}
                strokeColor={(s.completionRate || 0) >= 80 ? '#52c41a' : (s.completionRate || 0) >= 50 ? '#faad14' : '#ff4d4f'}
              />
              <div>
                <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>
                  <SafetyOutlined style={{ marginRight: 6 }} />
                  Tỉ lệ hoàn thành
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  Tính trên toàn bộ {s.total ?? 0} tasks trong hệ thống
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* ── Deadline tổng quan — toàn bộ hệ thống, không lọc, kèm mỗi lần gọi /dashboard/progress ── */}
      {deadline && (
        <Card size="small" style={{ marginBottom: 24 }}>
          <Space wrap size={24}>
            <Typography.Text type="secondary">Tổng quan Deadline (toàn hệ thống):</Typography.Text>
            <Tag color="green">Đúng hạn: {deadline.onTime ?? 0}</Tag>
            <Tag color="orange">Trễ: {deadline.late ?? 0}</Tag>
            <Tag color="red">Quá hạn: {deadline.overdue ?? 0}</Tag>
            <Tag color="blue">Đang chạy: {deadline.inProgress ?? 0}</Tag>
          </Space>
        </Card>
      )}

      {/* ── Charts: theo Người dùng & theo Dự án (đúng ý nghĩa dữ liệu backend trả) ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Thống kê Tasks theo Người dùng (Top 8)" bodyStyle={{ paddingTop: 8 }}>
            {userBarData.length === 0 ? (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={userBarData} margin={{ top: 8, right: 8, left: -16, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                    formatter={(v, name) => [v, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Hoàn thành" stackId="a" fill="#52c41a" />
                  <Bar dataKey="Đang làm" stackId="a" fill="#1677ff" />
                  <Bar dataKey="Chờ xử lý" stackId="a" fill="#8c8c8c" />
                  <Bar dataKey="Tạm dừng" stackId="a" fill="#faad14" />
                  <Bar dataKey="Không xong" stackId="a" fill="#ff4d4f" />
                  <Bar dataKey="Trễ hạn" stackId="a" fill="#722ed1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Thống kê Tasks theo Dự án (Top 8)" bodyStyle={{ paddingTop: 8 }}>
            {projectBarData.length === 0 ? (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
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
          </Space>
        }
      >
        <Table
          rowKey="userId"
          dataSource={taskProgress}
          columns={taskProgressColumns}
          pagination={{
            current: tableCurrent(taskPagination),
            pageSize: tablePageSize(taskPagination),
            total: tableTotal(taskPagination),
            showTotal: () => `Trang ${tableCurrent(taskPagination)} / ${taskPagination.totalPage || 1}`,
            onChange: (p) => setTaskFilters((f: any) => ({ ...f, page: p })),
          }}
          size="small"
          scroll={{ x: 700 }}
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
            current: tableCurrent(projectPagination),
            pageSize: tablePageSize(projectPagination),
            total: tableTotal(projectPagination),
            showTotal: () => `Trang ${tableCurrent(projectPagination)} / ${projectPagination.totalPage || 1}`,
            onChange: (p) => setProjectFilters((f: any) => ({ ...f, page: p })),
          }}
          size="small"
          scroll={{ x: 700 }}
        />
      </Card>
    </div>
  );
}