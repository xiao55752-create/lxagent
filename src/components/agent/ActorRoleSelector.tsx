import { Select } from 'antd'
import { ACTOR_ROLE_LABELS, type ActorRole } from '../../utils/actorRole'
import { useInitiationStore } from '../../store/useInitiationStore'

export default function ActorRoleSelector() {
  const actorRole = useInitiationStore((s) => s.actorRole)
  const setActorRole = useInitiationStore((s) => s.setActorRole)

  return (
    <div className="actor-role-selector">
      <span className="actor-role-label">当前身份</span>
      <Select
        size="small"
        value={actorRole}
        onChange={(v) => setActorRole(v as ActorRole)}
        options={Object.entries(ACTOR_ROLE_LABELS).map(([value, label]) => ({ value, label }))}
        popupMatchSelectWidth={false}
      />
    </div>
  )
}
