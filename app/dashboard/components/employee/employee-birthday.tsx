'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export interface Employee {
  Id: string;
  Name?: string;
  Employee_Name__c: string;
  Role__c?: string;
  Title__c?: string;
  Profile_Photo__c?: string;
  Department__c?: string;
}

interface BirthdayKpiCardProps {
  data: Employee[];
}

const BirthdayKpiCard: React.FC<BirthdayKpiCardProps> = ({ data }) => {
  const router = useRouter();
  return (
    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-all duration-300 w-full h-full">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">
            Today’s {data?.length > 1 ? 'Birthdays' : 'Birthday'}
          </h2>
          <p className="text-sm text-gray-400">
            Celebrate your team
          </p>
        </div>

        {/* KPI Count */}
        <div className="text-3xl font-bold text-blue-600">
          {data?.length}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mb-3" />

      {/* Content */}
      {data?.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          No birthdays today 
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-3 pr-2 bg-blue-50 rounded-xl">
          {data?.map((emp) => (
            <div
              key={emp.Id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition cursor-pointer"
              onClick={()=>router.push(`/employees/${emp.Id}`)}
            >
              {/* Avatar */}
              <img
                src={emp.Profile_Photo__c}
                alt={emp.Employee_Name__c}
                className="w-10 h-10 rounded-full object-cover border"
              />

              {/* Info */}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {emp.Employee_Name__c}
                </p>
                <p className="text-xs text-gray-500">{`${emp.Title__c}  ${emp.Role__c}`}</p>
              </div>

              {/* Badge */}
              <div className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                🎉
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BirthdayKpiCard;