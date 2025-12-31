
// Helper hook/component to avoid re-creation
export const Field = ({ label, value, fieldKey, type = "text", isEditing, formData, setFormData }: any) => (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      {isEditing ? (
         <input 
            type={type}
            value={formData[fieldKey] !== undefined ? formData[fieldKey] : (value || "")}
            onChange={(e) => setFormData({...formData, [fieldKey]: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition"
         />
      ) : (
         <p className="font-medium text-slate-800 text-sm break-words">{value || <span className="text-slate-400 italic">Not set</span>}</p>
      )}
    </div>
  )
