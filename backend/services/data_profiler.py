import pandas as pd
import json
import os
from typing import Dict, Any, Optional, List


def profile_dataset(file_path: str, selected_sheet: Optional[str] = None) -> Dict[str, Any]:
    """
    Profile a dataset file and return metadata and preview.
    Supports xlsx, xlsm, csv, json.
    """
    file_name = os.path.basename(file_path)
    ext = os.path.splitext(file_name)[1].lower()

    sheets = []
    suggested_sheet = None
    df = None

    try:
        if ext in [".xlsx", ".xlsm", ".xls"]:
            xl = pd.ExcelFile(file_path)
            sheets = xl.sheet_names
            suggested_sheet = _suggest_sheet(sheets, selected_sheet)
            df = pd.read_excel(file_path, sheet_name=suggested_sheet)
        elif ext == ".csv":
            df = pd.read_csv(file_path, encoding="utf-8", on_bad_lines="skip")
            sheets = ["Sheet1"]
            suggested_sheet = "Sheet1"
        elif ext == ".json":
            df = pd.read_json(file_path)
            sheets = ["Sheet1"]
            suggested_sheet = "Sheet1"
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        profile = _build_profile(df, file_name, sheets, suggested_sheet)
        return profile

    except Exception as e:
        return {
            "error": str(e),
            "file_name": file_name,
            "sheets": sheets,
            "suggested_sheet": suggested_sheet,
        }


def _suggest_sheet(sheets: List[str], selected_sheet: Optional[str] = None) -> str:
    if selected_sheet and selected_sheet in sheets:
        return selected_sheet
    if sheets:
        return sheets[0]
    return ""


def _detect_period(df: pd.DataFrame) -> Optional[str]:
    """Try to detect the time period from the data."""
    date_cols = []
    for col in df.columns:
        if any(kw in str(col).lower() for kw in ["data", "date", "mes", "month", "ano", "year", "periodo", "period"]):
            date_cols.append(col)

    for col in date_cols:
        try:
            series = pd.to_datetime(df[col], errors="coerce").dropna()
            if len(series) > 0:
                min_date = series.min().strftime("%Y-%m")
                max_date = series.max().strftime("%Y-%m")
                if min_date == max_date:
                    return min_date
                return f"{min_date} to {max_date}"
        except Exception:
            continue
    return None


def _build_profile(df: pd.DataFrame, file_name: str, sheets: List[str], suggested_sheet: str) -> Dict[str, Any]:
    numeric_cols = []
    text_cols = []
    percentage_cols = []
    null_counts = {}

    for col in df.columns:
        col_str = str(col)
        null_counts[col_str] = int(df[col].isnull().sum())

        if "%" in col_str or "pct" in col_str.lower() or "percent" in col_str.lower() or "taxa" in col_str.lower():
            percentage_cols.append(col_str)
        elif pd.api.types.is_numeric_dtype(df[col]):
            numeric_cols.append(col_str)
        else:
            text_cols.append(col_str)

    detected_period = _detect_period(df)

    preview_df = df.head(10)
    preview = []
    for _, row in preview_df.iterrows():
        row_dict = {}
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                row_dict[str(col)] = None
            elif isinstance(val, (int, float)):
                row_dict[str(col)] = val
            else:
                row_dict[str(col)] = str(val)
        preview.append(row_dict)

    return {
        "file_name": file_name,
        "sheets": sheets,
        "suggested_sheet": suggested_sheet,
        "row_count": len(df),
        "column_count": len(df.columns),
        "columns": [str(c) for c in df.columns],
        "detected_period": detected_period,
        "numeric_cols": numeric_cols,
        "text_cols": text_cols,
        "percentage_cols": percentage_cols,
        "null_counts": null_counts,
        "preview": preview,
    }


def get_data_summary_for_prompt(profile: Dict[str, Any]) -> str:
    """Generate a text summary of dataset for use in AI prompts."""
    lines = []
    lines.append(f"Arquivo: {profile.get('file_name', 'N/A')}")
    lines.append(f"Aba selecionada: {profile.get('suggested_sheet', 'N/A')}")
    lines.append(f"Total de linhas: {profile.get('row_count', 'N/A')}")
    lines.append(f"Total de colunas: {profile.get('column_count', 'N/A')}")

    if profile.get("detected_period"):
        lines.append(f"Período detectado: {profile['detected_period']}")

    cols = profile.get("columns", [])
    if cols:
        lines.append(f"Colunas disponíveis: {', '.join(cols)}")

    numeric = profile.get("numeric_cols", [])
    if numeric:
        lines.append(f"Colunas numéricas: {', '.join(numeric)}")

    pct = profile.get("percentage_cols", [])
    if pct:
        lines.append(f"Colunas de percentual/taxa: {', '.join(pct)}")

    text = profile.get("text_cols", [])
    if text:
        lines.append(f"Colunas de texto/categoria: {', '.join(text)}")

    return "\n".join(lines)
