import { Row, Col, Card, Tag, Button, Progress, Space } from 'antd';
import { UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Training } from "@/types"

interface TrainingListProps {
  trainings: Training[]
  onSelect: (training: Training) => void
  onEnroll?: (trainingId: string) => void
}

export function TrainingList({ trainings, onSelect, onEnroll }: TrainingListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'blue';
      case 'ongoing': return 'orange';
      case 'completed': return 'green';
      default: return 'default';
    }
  };

  return (
    <Row gutter={[24, 24]}>
      {trainings.map((training) => (
        <Col xs={24} md={12} lg={8} key={training.id}>
          <Card
            hoverable
            title={training.title}
            extra={<Tag color={getStatusColor(training.status)} className="capitalize">{training.status}</Tag>}
            className="h-full flex flex-col"
            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <p className="text-gray-500 mb-4 flex-grow">{training.description}</p>
            
            <div className="space-y-3 mb-6">
               <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500"><UserOutlined className="mr-1"/> Instructor</span>
                   <span className="font-medium">{training.instructor}</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500"><ClockCircleOutlined className="mr-1"/> Duration</span>
                   <span className="font-medium">{training.duration} hours</span>
               </div>
               
               <div className="pt-2">
                 <div className="flex justify-between text-xs mb-1 text-gray-500">
                     <span>Enrolled</span>
                     <span>{training.enrolledCount} / {training.maxParticipants}</span>
                 </div>
                 <Progress 
                    percent={Math.round((training.enrolledCount / training.maxParticipants) * 100)} 
                    size="small" 
                    status="active"
                 />
               </div>
            </div>

            <Space className="w-full pt-4 border-t border-gray-100">
              <Button block onClick={() => onSelect(training)}>View Details</Button>
              {onEnroll && (
                <Button block type="primary" onClick={() => onEnroll(training.id)}>Enroll</Button>
              )}
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  )
}
