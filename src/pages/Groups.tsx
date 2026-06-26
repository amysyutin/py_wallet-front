import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { createGroup, deleteGroup, getGroups } from "../api/groups";
import { getErrorMessage } from "../api/client";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
export function Groups() {
  const queryClient = useQueryClient(); const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const groupsQuery = useQuery({ queryKey: ["wallet-groups"], queryFn: getGroups });
  const createMutation = useMutation({ mutationFn: createGroup, onSuccess: () => { setName(""); setDescription(""); queryClient.invalidateQueries({ queryKey: ["wallet-groups"] }); } });
  const deleteMutation = useMutation({ mutationFn: deleteGroup, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wallet-groups"] }) });
  function handleCreate(event: FormEvent) { event.preventDefault(); createMutation.mutate({ name, description: description || undefined }); }
  return <section className="content-band"><SectionHeader eyebrow="Wallet groups" title="Группы кошельков" /><form className="inline-form" onSubmit={handleCreate}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название группы" required /><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание" /><button className="primary-button" type="submit" disabled={createMutation.isPending}><Plus size={18} />Создать</button></form>{createMutation.isError ? <p className="form-error">{getErrorMessage(createMutation.error)}</p> : null}{groupsQuery.isLoading ? <PageState title="Загружаем группы" /> : null}{groupsQuery.isError ? <PageState title="Не удалось загрузить группы" /> : null}<div className="table-list">{(groupsQuery.data ?? []).sort((a, b) => a.sort_order - b.sort_order).map((group) => <article className="table-row" key={group.id}><div><strong>{group.name}</strong><span>{group.description || "Без описания"}</span></div><span>{group.wallets_count ?? 0} wallets</span><button className="icon-button danger" type="button" onClick={() => deleteMutation.mutate(group.id)} aria-label="Удалить группу"><Trash2 size={17} /></button></article>)}</div></section>;
}
