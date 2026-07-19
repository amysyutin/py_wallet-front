import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { getErrorMessage } from "../api/client";
import { createGroup, deleteGroup, getGroups } from "../api/groups";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { usePageCopy } from "../telegram/i18n";

export function Groups() {
  const copy = usePageCopy();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const groupsQuery = useQuery({ queryKey: ["wallet-groups"], queryFn: getGroups });
  const createMutation = useMutation({ mutationFn: createGroup, onSuccess: () => { setName(""); setDescription(""); queryClient.invalidateQueries({ queryKey: ["wallet-groups"] }); } });
  const deleteMutation = useMutation({ mutationFn: deleteGroup, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wallet-groups"] }) });
  function handleCreate(event: FormEvent) { event.preventDefault(); createMutation.mutate({ name, description: description || undefined }); }
  return (
    <section className="content-band">
      <SectionHeader eyebrow="Wallet groups" title={copy.groupsTitle} />
      <form className="inline-form" onSubmit={handleCreate}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.groupName} required />
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder={copy.description} />
        <button className="primary-button" type="submit" disabled={createMutation.isPending}><Plus size={18} />{copy.create}</button>
      </form>
      {createMutation.isError ? <p className="form-error">{getErrorMessage(createMutation.error)}</p> : null}
      {groupsQuery.isLoading ? <PageState title={copy.loadingGroups} /> : null}
      {groupsQuery.isError ? <PageState title={copy.groupsFailed} /> : null}
      <div className="table-list">
        {(groupsQuery.data ?? []).sort((a, b) => a.sort_order - b.sort_order).map((group) => (
          <article className="table-row" key={group.id}>
            <div><strong>{group.name}</strong><span>{group.description || copy.noDescription}</span></div>
            <span>{group.wallets_count ?? 0} wallets</span>
            <button className="icon-button danger" type="button" onClick={() => deleteMutation.mutate(group.id)} aria-label={copy.deleteGroup}><Trash2 size={17} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}
