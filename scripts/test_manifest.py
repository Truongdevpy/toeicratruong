import json

def test_manifest_routes():
    with open('features.manifest.json', 'r', encoding='utf-8-sig') as f:
        manifest = json.load(f)
    print(f"Loaded manifest with {len(manifest)} tracked feature items.")
    for item in manifest:
        assert 'id' in item and 'route' in item and 'element' in item
        print(f" - [{item['id']}] route: {item['route']} | element: {item['element']}")
    print("ALL MANIFEST DEFINITIONS VALID!")

if __name__ == '__main__':
    test_manifest_routes()
