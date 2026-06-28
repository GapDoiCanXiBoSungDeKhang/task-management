import { Button, Card, Space, Tag } from 'antd';
import { TASK_STATUS_COLOR, TASK_STATUS_OPTIONS, TaskStatus } from '../types';

interface Props {
  item: any;
  onOpenDetail?: (id: string) => void;
  depth?: number;
}

export default function SubtaskCard({ item, onOpenDetail, depth = 0 }: Props) {
  return (
    <div style={{ marginBottom: 10, marginLeft: depth * 16 }}>
      <Card
        size="small"
        title={
          <Space>
            <span style={{ fontWeight: 500 }}>{item.title}</span>
            <Tag color={TASK_STATUS_COLOR[item.status as TaskStatus]}>
              {TASK_STATUS_OPTIONS.find(o => o.value === item.status)?.label || item.status}
            </Tag>
          </Space>
        }
        extra={
          onOpenDetail && (
            <Button size="small" type="link" onClick={() => onOpenDetail(item._id)}>
              Chi tiết
            </Button>
          )
        }
      >
        {item.content && (
          <div style={{ color: '#555', marginBottom: 8, fontSize: 13 }}>{item.content}</div>
        )}
        {item.childs && item.childs.length > 0 && (
          <div style={{ borderLeft: '2px dashed #e8e8e8', paddingLeft: 12, marginTop: 8 }}>
            {item.childs.map((child: any) => (
              <SubtaskCard key={child._id} item={child} onOpenDetail={onOpenDetail} depth={0} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
