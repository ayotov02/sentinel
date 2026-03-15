"""
Nova Act: Maritime Registry Lookup (Equasis)
Automates vessel registry searches using headless browser automation.

Usage:
  pip install nova-act
  python scripts/nova-act/maritime_registry.py --imo 9811000
"""

import argparse
import json
import sys

try:
    from nova_act import NovaAct
except ImportError:
    print("Nova Act SDK not installed. Install with: pip install nova-act")
    sys.exit(1)


def lookup_vessel(imo: str) -> dict:
    """Look up vessel details from Equasis maritime registry."""
    with NovaAct(
        starting_page="https://www.equasis.org/EquasisWeb/public/HomePage",
        headless=True,
    ) as nova:
        # Navigate to ship search
        nova.act("Click on the 'Ship' search tab")
        nova.act(f"Enter '{imo}' in the IMO number search field")
        nova.act("Click the 'Search' button")

        # Wait for results
        nova.act("Wait for the search results table to load")

        # Extract vessel information
        result = nova.act(
            "Extract all vessel information from the search results page. "
            "Include: vessel name, IMO number, MMSI, flag state, ship type, "
            "gross tonnage, DWT, year of build, and registered owner. "
            "Return as a JSON object.",
            schema={
                "type": "object",
                "properties": {
                    "vessel_name": {"type": "string"},
                    "imo": {"type": "string"},
                    "mmsi": {"type": "string"},
                    "flag_state": {"type": "string"},
                    "ship_type": {"type": "string"},
                    "gross_tonnage": {"type": "number"},
                    "dwt": {"type": "number"},
                    "year_built": {"type": "number"},
                    "registered_owner": {"type": "string"},
                    "manager": {"type": "string"},
                    "classification_society": {"type": "string"},
                },
            },
        )

        return result.parsed_response


def main():
    parser = argparse.ArgumentParser(description="Equasis vessel registry lookup via Nova Act")
    parser.add_argument("--imo", required=True, help="IMO number to look up")
    parser.add_argument("--output", default=None, help="Output JSON file path")
    args = parser.parse_args()

    print(f"Looking up vessel IMO {args.imo} on Equasis...")
    vessel_data = lookup_vessel(args.imo)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(vessel_data, f, indent=2)
        print(f"Results written to {args.output}")
    else:
        print(json.dumps(vessel_data, indent=2))


if __name__ == "__main__":
    main()
