import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Button, Card, DatePicker, Input, Select, Space, Table, Tag, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Project, ProjectStatus, PROJECT_STATUS_OPTIONS, PROJECT_STATUS_COLOR } from '../types';
import { fetchProjects } from '../api/projects';
import { EyeOutlined } from '@ant-design/icons';

export default function ProjectsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '4');
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const deadline = searchParams.get('deadline') || '';
  const sortKey = searchParams.get('sort_key') || '';
  const sortValue = searchParams.get('sort_value') || '';

  const setParam = (key: string, val: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (val) sp.set(key, val); else sp.delete(key);
    if (key !== 'page') sp.set('page', '1');
    setSearchParams(sp);
  };
  const setPage = (p: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('page', String(p));
    setSearchParams(sp);
  };
  const setLimit = (l: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('limit', String(l));
    sp.set('page', '1');
    setSearchParams(sp);
  };

  async function load() {
    setLoading(true);
    try {
      const res = await fetchProjects({
        page, limit,
        keyword: keyword || undefined,
        status: status || undefined,
        deadline: deadline || undefined,
        sort_key: sortKey || undefined,
        sort_value: sortValue || undefined,
      });
      setData(res.data || []);
      const pg = res.pagination || {};
      const t = typeof pg.totalItems === 'number' ? pg.totalItems : (pg.totalPage || 1) * (pg.limit || limit);
      setTotal(t || (page - 1) * limit + (res.data?.length || 0));
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi tải dự án');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [searchParams.toString()]);

  const columns: ColumnsType<Project> = [
    {
      title: 'Tên dự án',
      dataIndex: 'title',
      render: (text, record) => (
        <Link to={`/projects/${record._id}`} style={{ fontWeight: 500 }}>{text}</Link>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v: ProjectStatus) => (
        <Tag color={PROJECT_STATUS_COLOR[v]}>
          {PROJECT_STATUS_OPTIONS.find(o => o.value === v)?.label || v}
        </Tag>
      ),
    },
    {
      title: 'Deadline',
      dataIndex: 'deadline',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'Tạo bởi',
      dataIndex: ['createdBy', 'fullName'],
      render: (v: string) => v || '—',
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/projects/${record._id}`)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <Card title="Danh sách Projects">
      <Space style={{ marginBottom: 16, width: '100%' }} wrap>
        <Input.Search
          placeholder="Tìm theo tiêu đề/mô tả"
          allowClear
          value={keyword}
          onChange={(e) => setParam('keyword', e.target.value)}
          onSearch={() => load()}
          style={{ width: 280 }}
        />
        <Select
          placeholder="Trạng thái"
          allowClear
          style={{ width: 180 }}
          value={status || undefined}
          onChange={(v) => setParam('status', v || '')}
          options={PROJECT_STATUS_OPTIONS}
        />
        <DatePicker
          placeholder="Deadline"
          onChange={(d) => setParam('deadline', d ? d.format('YYYY-MM-DD') : '')}
          value={deadline ? dayjs(deadline) : undefined}
          style={{ width: 180 }}
        />
        <Select
          placeholder="Sort theo"
          allowClear
          style={{ width: 160 }}
          value={sortKey || undefined}
          onChange={(v) => setParam('sort_key', v || '')}
          options={[{ value: 'title', label: 'Tiêu đề' }, { value: 'deadline', label: 'Deadline' }]}
        />
        <Select
          placeholder="Thứ tự"
          allowClear
          style={{ width: 130 }}
          value={sortValue || undefined}
          onChange={(v) => setParam('sort_value', v || '')}
          options={[{ value: 'asc', label: 'Tăng dần' }, { value: 'desc', label: 'Giảm dần' }]}
        />
      </Space>

      <Table
        rowKey="_id"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          pageSizeOptions: [4, 8, 12, 20, 50] as any,
          showTotal: (t) => `Tổng ${t} dự án`,
          onChange: (p, ps) => { setPage(p); setLimit(ps); },
          onShowSizeChange: (_, ps) => { setPage(1); setLimit(ps); },
        }}
      />
    </Card>
  );
}
