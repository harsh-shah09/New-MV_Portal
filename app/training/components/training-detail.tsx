import { Modal, Button, Descriptions, Tag, Progress } from 'antd';
import type { Training } from "@/types"

interface TrainingDetailProps {
  training: Training
  onClose: () => void
  onEnroll?: (trainingId: string) => void
}

export function TrainingDetail({ training, onClose, onEnroll }: TrainingDetailProps) {
  const getStatusColor = (status: string) => {
      switch (status) {
        case 'scheduled': return 'blue';
        case 'ongoing': return 'orange';
        case 'completed': return 'green';
        default: return 'default';
      }
  };

  return (
    <Modal
      title={training.title}
      open={true}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          Close
        </Button>,
        onEnroll && (
            <Button key="enroll" type="primary" onClick={() => onEnroll(training.id)}>
              Enroll Now
            </Button>
        )
      ]}
      width={700}
      centered
    >
      <div className="py-4">
         <p className="text-gray-600 mb-6">{training.description}</p>
         
         <Descriptions bordered column={2} size="small">
             <Descriptions.Item label="Category">{training.category}</Descriptions.Item>
             <Descriptions.Item label="Instructor">{training.instructor}</Descriptions.Item>
             <Descriptions.Item label="Duration">{training.duration} hours</Descriptions.Item>
             <Descriptions.Item label="Status">
                 <Tag color={getStatusColor(training.status)} className="capitalize">{training.status}</Tag>
             </Descriptions.Item>
             <Descriptions.Item label="Start Date">{training.startDate}</Descriptions.Item>
             <Descriptions.Item label="End Date">{training.endDate}</Descriptions.Item>
         </Descriptions>

         <div className="mt-6 p-4 bg-gray-50 rounded-lg">
             <div className="flex justify-between mb-2">
                 <span className="font-medium text-gray-700">Enrollment Status</span>
                 <span className="text-gray-500">{training.enrolledCount} / {training.maxParticipants} Students</span>
             </div>
             <Progress 
                percent={Math.round((training.enrolledCount / training.maxParticipants) * 100)} 
                status="active" 
                strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
             />
         </div>
      </div>
    </Modal>
  )
}
