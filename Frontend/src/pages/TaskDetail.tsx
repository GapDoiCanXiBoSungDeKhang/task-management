import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Button, Card, Descriptions, Select, Space, Tag, Tabs,
  message, Breadcrumb, Skeleton, Empty,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Task, TaskStatus, TASK_STATUS_OPTIONS, TASK_STATUS_COLOR } from '../types';
import {
  fetchTaskDetail, fetchTaskSubtasks, fetchTaskUsers,
  changeTaskStatus, editTask,
} from '../api/tasks';
import TaskForm from '../components/TaskForm';
import MembersPanel from '../components/MembersPanel';
import SubtaskCard from '../components/SubtaskCard';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [members, setMembers] = useState<{ admin: any[]; user: any[] }>({ admin: [], user: [] });
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  async function load(taskId: string) {
    setLoading(true);
    try {
      const d = await fetchTaskDetail(taskId);
      const t: Task = d.data;
      setTask(t);

      // Both subtasks and members can fail silently:
      // - backend bug: listUsers=[] → no response from /list-user
      // - task may have no subtasks
      const [subResult, memResult] = await Promise.allSettled([
        fetchTaskSubtasks(taskId),
        (t.listUsers && (t.listUsers as any[]).length > 0)
          ? fetchTaskUsers(taskId)
          : Promise.resolve({ data: { admin: [], user: [] } }),
      ]);

      if (subResult.status === 'fulfilled') {
        setSubtasks(subResult.value?.data || []);
      }
      if (memResult.status === 'fulfilled') {
        setMembers(memResult.value?.data || { admin: [], user: [] });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 403) {
        message.error(err?.response?.data?.message || 'Không tìm thấy task');
        navigate('/tasks');
      } else {
        message.error('Lỗi tải dữ liệu task');
        navigate('/tasks');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(id); }, [id]);

  const handleChangeStatus = async (s: TaskStatus) => {
    if (!id) return;
    try {
      await changeTaskStatus(id, s);
      message.success('Cập nhật trạng thái thành công');
      load(id);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi cập nhật');
    }
  };

  const handleEdit = async (vals: Partial<Task>) => {
    if (!id) return;
    setFormLoading(true);
    try {
      await editTask(id, vals);
      message.success('Cập nhật thành công');
      setFormOpen(false);
      load(id);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi cập nhật');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <Skeleton active title={{ width: 300 }} paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (!task) return <Empty description="Không tìm thấy task" />;

  const memberCount = (members.admin?.length || 0) + (members.user?.length || 0);

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/tasks">Tasks</Link> },
          { title: task.title },
        ]}
      />

      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')} type="text" />
            <span style={{ fontWeight: 600, fontSize: 16 }}>{task.title}</span>
            <Tag color={TASK_STATUS_COLOR[task.status]}>
              {TASK_STATUS_OPTIONS.find(o => o.value === task.status)?.label || task.status}
            </Tag>
          </Space>
        }
        extra={
          <Space>
            <Select
              value={task.status}
              onChange={handleChangeStatus}
              options={TASK_STATUS_OPTIONS}
              style={{ width: 170 }}
            />
            <Button icon={<EditOutlined />} onClick={() => setFormOpen(true)}>
              Chỉnh sửa
            </Button>
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
                      <Tag color={TASK_STATUS_COLOR[task.status]}>
                        {TASK_STATUS_OPTIONS.find(o => o.value === task.status)?.label || task.status}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Bắt đầu">
                      {task.timeStart ? dayjs(task.timeStart).format('DD/MM/YYYY HH:mm') : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Kết thúc">
                      {task.timeFinish ? dayjs(task.timeFinish).format('DD/MM/YYYY HH:mm') : '—'}
                    </Descriptions.Item>
                    {task.projectId && (
                      <Descriptions.Item label="Dự án">
                        <Link to={`/projects/${task.projectId}`}>Xem dự án</Link>
                      </Descriptions.Item>
                    )}
                    {task.taskParentId && (
                      <Descriptions.Item label="Task cha">
                        <Link to={`/tasks/${task.taskParentId}`}>Xem task cha</Link>
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {task.content && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>Nội dung:</div>
                      <div style={{
                        whiteSpace: 'pre-wrap', background: '#fafafa',
                        padding: 12, borderRadius: 6, border: '1px solid #f0f0f0',
                      }}>
                        {task.content}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Subtasks ({subtasks.length})
                    </div>
                    {subtasks.length === 0
                      ? <Empty description="Không có subtask" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      : subtasks.map(it => (
                        <SubtaskCard
                          key={it._id}
                          item={it}
                          onOpenDetail={(sid) => navigate(`/tasks/${sid}`)}
                        />
                      ))
                    }
                  </div>
                </Space>
              ),
            },
            {
              key: 'members',
              label: `Thành viên (${memberCount})`,
              children: (
                memberCount === 0
                  ? <Empty description="Task chưa có thành viên" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  : <MembersPanel admin={members.admin} user={members.user} />
              ),
            },
          ]}
        />
      </Card>

      <TaskForm
        open={formOpen}
        loading={formLoading}
        initialValues={task}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleEdit}
      />
    </>
  );
}
