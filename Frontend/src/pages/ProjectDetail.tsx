import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Button, Card, Descriptions, Tag, Tabs, Space, List, message,
  Skeleton, Breadcrumb, Empty,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  Project, TaskStatus, ProjectStatus,
  TASK_STATUS_COLOR, TASK_STATUS_OPTIONS,
  PROJECT_STATUS_COLOR, PROJECT_STATUS_OPTIONS,
} from '../types';
import { fetchProjectDetail, fetchProjectMembers, fetchProjectTasks } from '../api/projects';
import MembersPanel from '../components/MembersPanel';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<{ admin: any[]; user: any[] }>({ admin: [], user: [] });
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        // Fetch detail first — must succeed
        const d = await fetchProjectDetail(id);
        setProject(d.data);

        // Members & tasks can fail silently (backend bug: no response when members=[])
        const [membersResult, tasksResult] = await Promise.allSettled([
          fetchProjectMembers(id),
          fetchProjectTasks(id),
        ]);

        if (membersResult.status === 'fulfilled') {
          setMembers(membersResult.value?.data || { admin: [], user: [] });
        }
        if (tasksResult.status === 'fulfilled') {
          setTasks(tasksResult.value?.data || []);
        }
      } catch (err: any) {
        // Only navigate away on project detail failure (404, etc.)
        const status = err?.response?.status;
        if (status === 404 || status === 403) {
          message.error(err?.response?.data?.message || 'Không tìm thấy dự án');
          navigate('/projects');
        } else {
          message.error('Lỗi tải dữ liệu dự án');
          navigate('/projects');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <Card>
        <Skeleton active avatar title={{ width: 300 }} paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (!project) return <Empty description="Không tìm thấy dự án" />;

  const memberCount = (members.admin?.length || 0) + (members.user?.length || 0);

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/projects">Projects</Link> },
          { title: project.title },
        ]}
      />

      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')} type="text" />
            <span style={{ fontWeight: 600, fontSize: 16 }}>{project.title}</span>
            <Tag color={PROJECT_STATUS_COLOR[project.status as ProjectStatus]}>
              {PROJECT_STATUS_OPTIONS.find(o => o.value === project.status)?.label || project.status}
            </Tag>
          </Space>
        }
      >
        <Tabs
          items={[
            {
              key: 'overview',
              label: 'Tổng quan',
              children: (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Descriptions bordered column={{ xs: 1, sm: 2 }}>
                    <Descriptions.Item label="Trạng thái">
                      <Tag color={PROJECT_STATUS_COLOR[project.status as ProjectStatus]}>
                        {PROJECT_STATUS_OPTIONS.find(o => o.value === project.status)?.label || project.status}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Deadline">
                      {project.deadline ? dayjs(project.deadline).format('DD/MM/YYYY') : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Tạo bởi">
                      {(project.createdBy as any)?.fullName || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày tạo">
                      {(project.createdBy as any)?.createdAt
                        ? dayjs((project.createdBy as any).createdAt).format('DD/MM/YYYY HH:mm')
                        : '—'}
                    </Descriptions.Item>
                  </Descriptions>
                  {project.description && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>Mô tả:</div>
                      <div style={{
                        whiteSpace: 'pre-wrap', background: '#fafafa',
                        padding: 12, borderRadius: 6, border: '1px solid #f0f0f0',
                      }}>
                        {project.description}
                      </div>
                    </div>
                  )}
                </Space>
              ),
            },
            {
              key: 'members',
              label: `Thành viên (${memberCount})`,
              children: (
                memberCount === 0
                  ? <Empty description="Dự án chưa có thành viên" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  : <MembersPanel admin={members.admin} user={members.user} />
              ),
            },
            {
              key: 'tasks',
              label: `Tasks (${tasks.length})`,
              children: tasks.length === 0
                ? <Empty description="Dự án chưa có task" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                : (
                  <List
                    dataSource={tasks}
                    renderItem={(it: any) => (
                      <List.Item
                        key={it._id}
                        actions={[
                          <Link to={`/tasks/${it._id}`} key="view">Xem chi tiết</Link>,
                        ]}
                      >
                        <Space>
                          <Link to={`/tasks/${it._id}`} style={{ fontWeight: 500 }}>{it.title}</Link>
                          <Tag color={TASK_STATUS_COLOR[it.status as TaskStatus]}>
                            {TASK_STATUS_OPTIONS.find(o => o.value === it.status)?.label || it.status}
                          </Tag>
                        </Space>
                      </List.Item>
                    )}
                  />
                ),
            },
          ]}
        />
      </Card>
    </>
  );
}
