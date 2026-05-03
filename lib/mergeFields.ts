export interface MergeData {
  kunde_navn?: string
  org_nummer?: string
  startdato?: string
  sluttdato?: string
  firma_navn?: string
}

export function substituteMergeFields(html: string, data: MergeData): string {
  return html
    .replace(/\{\{kunde_navn\}\}/g, data.kunde_navn ?? "{{kunde_navn}}")
    .replace(/\{\{org_nummer\}\}/g, data.org_nummer ?? "{{org_nummer}}")
    .replace(/\{\{startdato\}\}/g, data.startdato ?? "{{startdato}}")
    .replace(/\{\{sluttdato\}\}/g, data.sluttdato ?? "{{sluttdato}}")
    .replace(/\{\{firma_navn\}\}/g, data.firma_navn ?? "{{firma_navn}}")
}
