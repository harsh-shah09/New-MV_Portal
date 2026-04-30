'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

export interface AnniversaryEmployee {
  Id: string;
  Name?: string;
  Employee_Name__c: string;
  Role__c?: string;
  Title__c?: string;
  Profile_Photo__c?: string;
  Department__c?: string;
  Onboarding_Date__c?: string;
}

interface AnniversaryKpiCardProps {
  data: AnniversaryEmployee[];
}

const EmployeeAnniversary: React.FC<AnniversaryKpiCardProps> = ({ data }) => {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-all duration-300 w-full h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Today’s Work {data?.length > 1 ? 'Anniversaries' : 'Anniversary'}</h2>
          <p className="text-sm text-gray-400">Celebrate milestones</p>
        </div>

        <div className="text-3xl font-bold text-violet-600">{data?.length}</div>
      </div>

      <div className="border-t border-gray-100 mb-3" />

      {data?.length === 0 ? (
        <div className="text-center py-6 text-gray-400">No anniversaries today</div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-3 pr-2 bg-violet-50 rounded-xl">
          {data?.map((emp) => {
            const years = emp.Onboarding_Date__c
              ? dayjs().diff(dayjs(emp.Onboarding_Date__c), 'year')
              : 0;

            return (
              <div
                key={emp.Id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-violet-100/60 transition cursor-pointer"
                onClick={() => router.push(`/employees/${emp.Id}`)}
              >
                <img
                  src={emp.Profile_Photo__c}
                  alt={emp.Employee_Name__c}
                  className="w-10 h-10 rounded-full object-cover border"
                />

                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{emp.Employee_Name__c}</p>
                  <p className="text-xs text-gray-500">{`${emp.Title__c}  ${emp.Role__c}`}</p>
                </div>

                <div className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-medium">
                  {years > 0 ? `${years} yr${years > 1 ? 's' : ''}` : 'New'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeAnniversary;
