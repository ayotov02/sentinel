"""
Nova Act: Company Lookup (OpenCorporates)
Automates company registry searches using headless browser automation.

Usage:
  pip install nova-act
  python scripts/nova-act/company_lookup.py --name "Acme Corp" --jurisdiction us
"""

import argparse
import json
import sys

try:
    from nova_act import NovaAct
except ImportError:
    print("Nova Act SDK not installed. Install with: pip install nova-act")
    sys.exit(1)


def lookup_company(name: str, jurisdiction: str = "") -> list[dict]:
    """Search for company details on OpenCorporates."""
    search_url = f"https://opencorporates.com/companies?q={name.replace(' ', '+')}"
    if jurisdiction:
        search_url += f"&jurisdiction_code={jurisdiction}"

    with NovaAct(starting_page=search_url, headless=True) as nova:
        # Wait for search results
        nova.act("Wait for the company search results to load")

        # Extract company information
        result = nova.act(
            "Extract the top 5 company results from the search page. "
            "For each company include: name, jurisdiction, company number, "
            "status (active/inactive), incorporation date, and registered address. "
            "Return as a JSON array of objects.",
            schema={
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "jurisdiction": {"type": "string"},
                        "company_number": {"type": "string"},
                        "status": {"type": "string"},
                        "incorporation_date": {"type": "string"},
                        "registered_address": {"type": "string"},
                        "url": {"type": "string"},
                    },
                },
            },
        )

        companies = result.parsed_response

        # For the first result, get detailed officer information
        if companies:
            nova.act(f"Click on the first company result: {companies[0].get('name', '')}")
            nova.act("Wait for the company detail page to load")

            officers = nova.act(
                "Extract all officers/directors listed on this company page. "
                "Include: name, role, appointment date, and nationality if available. "
                "Return as a JSON array.",
                schema={
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "role": {"type": "string"},
                            "appointment_date": {"type": "string"},
                            "nationality": {"type": "string"},
                        },
                    },
                },
            )

            companies[0]["officers"] = officers.parsed_response

        return companies


def main():
    parser = argparse.ArgumentParser(description="OpenCorporates company lookup via Nova Act")
    parser.add_argument("--name", required=True, help="Company name to search")
    parser.add_argument("--jurisdiction", default="", help="Jurisdiction code (e.g., us_de, gb)")
    parser.add_argument("--output", default=None, help="Output JSON file path")
    args = parser.parse_args()

    print(f"Searching for '{args.name}' on OpenCorporates...")
    companies = lookup_company(args.name, args.jurisdiction)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(companies, f, indent=2)
        print(f"Results written to {args.output}")
    else:
        print(json.dumps(companies, indent=2))


if __name__ == "__main__":
    main()
