import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeviceStore } from '@/stores/deviceStore'
import StatusBadge from '@/components/StatusBadge'
import type { DeviceType, DeviceStatus } from '@/types'
import { DEVICE_TYPE_LABELS } from '@/types'

export default function Devices() {
  const navigate = useNavigate()
  const { devices, addDevice } = useDeviceStore()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<DeviceType | ''>('')
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | ''>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDevice, setNewDevice] = useState({ name: '', type: 'standing' as DeviceType, specs: '' })

  const filtered = devices.filter((d) => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter && d.type !== typeFilter) return false
    if (statusFilter && d.status !== statusFilter) return false
    return true
  })

  const handleAdd = () => {
    if (!newDevice.name.trim()) return
    addDevice({ name: newDevice.name.trim(), type: newDevice.type, specs: newDevice.specs.trim(), status: 'idle' })
    setNewDevice({ name: '', type: 'standing', specs: '' })
    setShowAddModal(false)
  }

  return (
    <div className="min-h-screen bg-[#060a14] px-4 pb-24 pt-6 text-white">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-5 text-xl font-bold">
          <span className="text-[#00F0FF]">设备</span>排期
        </h1>

        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索设备名称..."
              className="w-full rounded-lg border border-[#00F0FF]/20 bg-[#0d1220] py-2.5 pl-9 pr-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[#00F0FF]/50"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as DeviceType | '')}
              className="flex-1 rounded-lg border border-[#00F0FF]/20 bg-[#0d1220] px-3 py-2 text-sm text-gray-300 outline-none focus:border-[#00F0FF]/50"
            >
              <option value="">全部类型</option>
              {Object.entries(DEVICE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DeviceStatus | '')}
              className="flex-1 rounded-lg border border-[#00F0FF]/20 bg-[#0d1220] px-3 py-2 text-sm text-gray-300 outline-none focus:border-[#00F0FF]/50"
            >
              <option value="">全部状态</option>
              <option value="idle">空闲</option>
              <option value="in-use">使用中</option>
              <option value="disinfecting">消毒中</option>
              <option value="maintenance">维修中</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filtered.map((device) => (
            <button
              key={device.id}
              onClick={() => navigate(`/devices/${device.id}`)}
              className={cn(
                'group rounded-xl border bg-[#0d1220] p-4 text-left transition hover:border-[#00F0FF]/40',
                device.status === 'idle'
                  ? 'border-[#00F0FF]/20 animate-[pulse_3s_ease-in-out_infinite]'
                  : 'border-white/5'
              )}
              style={
                device.status === 'idle'
                  ? { boxShadow: '0 0 15px rgba(0,240,255,0.08)' }
                  : undefined
              }
            >
              <div className="mb-2 flex items-start justify-between">
                <span className="text-sm font-medium text-white">{device.name}</span>
              </div>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded bg-[#00F0FF]/10 px-1.5 py-0.5 text-[10px] text-[#00F0FF]">
                  {DEVICE_TYPE_LABELS[device.type]}
                </span>
                <StatusBadge status={device.status} />
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                <div>使用 <span className="text-gray-300">{device.totalUses}</span> 次</div>
                <div>消毒 <span className="text-gray-300">{formatTimeAgo(device.lastDisinfection)}</span></div>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-12 text-center text-sm text-gray-600">未找到匹配的设备</div>
        )}

        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF2D78] shadow-[0_0_20px_rgba(255,45,120,0.4)] transition hover:shadow-[0_0_30px_rgba(255,45,120,0.6)]"
        >
          <Plus size={24} className="text-white" />
        </button>

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-xl border border-[#FF2D78]/30 bg-[#0a0e1a] p-6 shadow-[0_0_30px_rgba(255,45,120,0.15)]">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#FF2D78]">添加设备</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">设备名称</label>
                  <input
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    placeholder="输入设备名称"
                    className="w-full rounded-lg border border-[#FF2D78]/30 bg-[#0d1220] px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-[#FF2D78]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">设备类型</label>
                  <select
                    value={newDevice.type}
                    onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value as DeviceType })}
                    className="w-full rounded-lg border border-[#FF2D78]/30 bg-[#0d1220] px-3 py-2 text-white outline-none focus:border-[#FF2D78]"
                  >
                    {Object.entries(DEVICE_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">规格</label>
                  <input
                    value={newDevice.specs}
                    onChange={(e) => setNewDevice({ ...newDevice, specs: e.target.value })}
                    placeholder="输入设备规格"
                    className="w-full rounded-lg border border-[#FF2D78]/30 bg-[#0d1220] px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-[#FF2D78]"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-lg border border-gray-600 py-2 text-gray-400 transition hover:border-gray-400 hover:text-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newDevice.name.trim()}
                  className={cn(
                    'flex-1 rounded-lg py-2 font-medium transition',
                    newDevice.name.trim()
                      ? 'bg-[#FF2D78] text-white hover:bg-[#FF2D78]/80'
                      : 'cursor-not-allowed bg-gray-700 text-gray-500'
                  )}
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}
