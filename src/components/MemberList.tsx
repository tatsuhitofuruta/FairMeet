import { StationInput } from './StationInput';
import type { GraphData } from '../lib/types';

export interface MemberInputState {
  id: number;
  text: string;
  stationIndex: number | null;
  error: string | null;
}

interface MemberListProps {
  members: MemberInputState[];
  setMembers: (members: MemberInputState[]) => void;
  graph: GraphData | null;
  onChange: () => void;
}

export function MemberList({ members, setMembers, graph, onChange }: MemberListProps) {
  const updateMember = (id: number, patch: Partial<MemberInputState>) => {
    setMembers(members.map((member) => (member.id === id ? { ...member, ...patch } : member)));
    onChange();
  };

  const addMember = () => {
    const nextId = Math.max(...members.map((member) => member.id)) + 1;
    setMembers([...members, { id: nextId, text: '', stationIndex: null, error: null }]);
    onChange();
  };

  const removeMember = (id: number) => {
    if (members.length <= 2) {
      return;
    }
    setMembers(members.filter((member) => member.id !== id));
    onChange();
  };

  return (
    <div className="member-list">
      {members.map((member, index) => (
        <div className="member-row" key={member.id}>
          <StationInput
            graph={graph}
            value={member.text}
            stationIndex={member.stationIndex}
            error={member.error}
            label={`メンバー${index + 1}`}
            onChange={(text) => updateMember(member.id, { text, stationIndex: null, error: null })}
            onSelect={(stationIndex, stationName) =>
              updateMember(member.id, { text: stationName, stationIndex, error: null })
            }
          />
          <button
            className="remove-button"
            type="button"
            onClick={() => removeMember(member.id)}
            disabled={members.length <= 2}
            aria-label={`メンバー${index + 1}を削除`}
          >
            削除
          </button>
        </div>
      ))}

      <button className="add-button" type="button" onClick={addMember} disabled={members.length >= 10}>
        + メンバーを追加
      </button>
    </div>
  );
}
