export type RawMetadataField = {
  fieldName?: string;
  valuesText?: string;
};

export type NormalizedMetadataField = {
  fieldKey: string;
  fieldLabel: string;
  values: string[];
};

function toFieldKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function splitValues(valuesText: string) {
  return valuesText
    .split(/[\n,;]+/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

function dedupePreserveOrder(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }

  return result;
}

export function normalizeCampaignTaxonomy(
  rawFields: RawMetadataField[] | undefined | null
): NormalizedMetadataField[] {
  if (!rawFields || !Array.isArray(rawFields)) return [];

  const normalized = rawFields
    .map((field) => {
      const fieldLabel = (field.fieldName || "").trim();
      const rawValuesText = field.valuesText || "";

      const values = dedupePreserveOrder(splitValues(rawValuesText));

      if (!fieldLabel || values.length === 0) {
        return null;
      }

      return {
        fieldKey: toFieldKey(fieldLabel),
        fieldLabel,
        values,
      };
    })
    .filter(Boolean) as NormalizedMetadataField[];

  const seenKeys = new Set<string>();

  return normalized.filter((field) => {
    if (seenKeys.has(field.fieldKey)) return false;
    seenKeys.add(field.fieldKey);
    return true;
  });
}