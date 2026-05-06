
// Helper hook/component to avoid re-creation
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Form ,DatePicker } from "antd"
import dayjs from "dayjs"
export interface FieldProps {
  label: string
  value: any
  fieldKey: string
  type?: string
  isEditing: boolean
  formData: any
  setFormData: (data: any) => void
  pattern?: string
  placeholder?: string
  options?: { label: string; value: string }[]
  error?: string
  className?: string
  locked?: boolean
  required?: boolean
  maxLength?: number
}

export const Field = ({ 
  label, 
  value, 
  fieldKey, 
  type = "text", 
  isEditing, 
  formData, 
  setFormData, 
  pattern,
  placeholder,
  options,
  error,
  className,
  locked,
  required,
  maxLength
}: FieldProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showNumber, setShowNumber] = useState(false)
  const isPasswordType = type === "password" || type === "confidential"
  const isNumberType = type === "number"
  const inputType = isPasswordType ? (showPassword ? "text" : "password") : type
  const isTelType = type === 'tel';
  const isDateType = type === 'date';
  const currentValue = formData[fieldKey] !== undefined ? formData[fieldKey] : (value || "")
  console.log(currentValue , fieldKey)
  const handleChange = (val: any) => {
      setFormData({ ...formData, [fieldKey]: val })
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex justify-between">
        <div>
        {label}
        {required && <span className="text-red-500 normal-case tracking-normal font-medium animate-pulse"> *</span>}
        </div>
        {error && isEditing && <span className="text-red-500 text-[10px] normal-case tracking-normal font-medium animate-pulse">{error}</span>}
      </label>
      
      {isEditing && !locked ? (
        isTelType ? (
          <div className="flex gap-2">
            {/* Country Code */}
            <input
              type="text"
              value={formData[`${fieldKey}`]?.includes("-") ? formData[`${fieldKey}`].split("-")[0] : (formData[`${fieldKey}`]?.startsWith("+") ? formData[`${fieldKey}`].slice(0, 3) : "+91")}
              onChange={(e) => {
                const phonePart = formData[`${fieldKey}`]?.includes("-") ? formData[`${fieldKey}`].split("-").slice(1).join("-") : formData[`${fieldKey}`]?.replace(/^\+?\d{1,3}/, "") || "";
                setFormData({
                  ...formData,
                  [`${fieldKey}`]: e.target.value + "-" + phonePart,
                })
              }}
              placeholder="+91"
              className={cn(
                "w-1/3 bg-slate-50 border rounded-lg px-3 py-2.5 text-sm",
                error ? "border-red-300" : "border-slate-200"
              )}
            />
        
            {/* Phone Number */}
            <input
              type="tel"
              value={formData[fieldKey]?.includes("-") ? formData[fieldKey].split("-").slice(1).join("-") : formData[fieldKey]?.replace(/^\+?\d{1,3}/, "") || ""}
              onChange={(e) => {
                const codePart = formData[`${fieldKey}`]?.includes("-") ? formData[`${fieldKey}`].split("-")[0] : (formData[`${fieldKey}`]?.startsWith("+") ? formData[`${fieldKey}`].slice(0, 3) : "+91");
                setFormData({
                  ...formData,
                  [`${fieldKey}`]: codePart + "-" + e.target.value,
                })
              }}
              placeholder={placeholder || "Enter phone number"}
              className={cn(
                "w-2/3 bg-slate-50 border rounded-lg px-3 py-2.5 text-sm",
                error ? "border-red-300" : "border-slate-200"
              )}
            />
          </div>
        ) : isDateType ? (
        <>  
          <DatePicker
            value={currentValue ? dayjs(currentValue) : null}
            onChange={(date) => {
              handleChange(date ? date.format("YYYY-MM-DD") : null)
              const year = date?.year();
              if (year && year > 3000) {
                  // Prevent year > 3000
                  return;
              }
            }}
            className={cn(
              "w-full bg-slate-50 border rounded-lg px-3 py-2.5 text-sm",
              error ? "border-red-300" : "border-slate-200"
            )}
            placeholder={placeholder || "Select date"}
            format="DD/MM/YYYY"
            style={{ height: "42px", width: "100%" }}
            disabledDate={(current) => {
              return current && current.year() > 3000;
            }}
          />
        </>
        ) : 
        type === "select" ? (
          <div className="relative">
             <select
                value={currentValue}
                onChange={(e) => handleChange(e.target.value)}
                className={cn(
                  "w-full bg-slate-50 border rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:ring-2 outline-none transition appearance-none",
                  error ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-400"
                )}
             >
                <option value="">Select {label}</option>
                {options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
             </select>
             <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
             </div>
          </div>
        ) : (
          <div className="relative">
             <input 
                type={inputType}
                value={currentValue}
                onChange={(e) => handleChange(e.target.value)}
                className={cn(
                  "w-full bg-slate-50 border rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:ring-2 outline-none transition placeholder:text-slate-400",
                  error ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-400",
                  isPasswordType && "pr-10"
                )}
                pattern={pattern}
                placeholder={placeholder}
                required={required}
                maxLength={maxLength}
              />
              {isPasswordType && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
          </div>
        )
      ) : (
         <p className="font-medium text-slate-800 text-sm break-words py-1 relative inline-block">
             {/* Mask confidential data if not editing */
               (isPasswordType && value) 
                 ? "•".repeat(8)
                 : isNumberType && value
                 ? (
                   <span className="flex items-center gap-2">
                     <span>{showNumber ? value : "****"}</span>
                     <button
                       type="button"
                       onClick={() => setShowNumber(!showNumber)}
                       className="text-slate-400 hover:text-slate-600 focus:outline-none"
                       title={showNumber ? "Hide value" : "Show value"}
                     >
                       {showNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                     </button>
                   </span>
                 ) : isDateType && value ? dayjs(value).format("DD/MM/YYYY") : (value || <span className="text-slate-400 italic">Not set</span>)
             }
         </p>
      )}
    </div>
  )
}
