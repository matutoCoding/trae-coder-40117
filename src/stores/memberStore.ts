import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Member } from '@/types'

const generateId = () => crypto.randomUUID()

const SAMPLE_MEMBERS: Member[] = [
  { id: 'm1', name: '张三', phone: '13800001111', role: 'member', vipLevel: 'none', avatar: '' },
  { id: 'm2', name: '李四', phone: '13800002222', role: 'vip', vipLevel: 'gold', avatar: '' },
  { id: 'm3', name: '王五', phone: '13800003333', role: 'vip', vipLevel: 'platinum', avatar: '' },
  { id: 'm4', name: '赵六', phone: '13800004444', role: 'member', vipLevel: 'none', avatar: '' },
  { id: 'm5', name: '孙七', phone: '13800005555', role: 'vip', vipLevel: 'silver', avatar: '' },
  { id: 'm6', name: '管理员', phone: '13800009999', role: 'admin', vipLevel: 'none', avatar: '' },
]

interface MemberState {
  members: Member[]
  currentMemberId: string
  addMember: (member: Omit<Member, 'id'>) => void
  setCurrentMember: (id: string) => void
  getMemberById: (id: string) => Member | undefined
  getCurrentMember: () => Member | undefined
}

export const useMemberStore = create<MemberState>()(
  persist(
    (set, get) => ({
      members: SAMPLE_MEMBERS,
      currentMemberId: 'm6',
      addMember: (member) => {
        const newMember: Member = { ...member, id: generateId() }
        set((state) => ({ members: [...state.members, newMember] }))
      },
      setCurrentMember: (id) => set({ currentMemberId: id }),
      getMemberById: (id) => get().members.find((m) => m.id === id),
      getCurrentMember: () => {
        const state = get()
        return state.members.find((m) => m.id === state.currentMemberId)
      },
    }),
    { name: 'vr-member-store' }
  )
)
