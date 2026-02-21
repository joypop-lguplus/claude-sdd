#!/usr/bin/env python3
"""
SDD 산출물에서 다이어그램을 PNG로 생성합니다.

사용법:
  python3 sdd-generate-diagram.py --type=architecture --input=docs/specs/02-architecture.md --output=/tmp/arch.png
  python3 sdd-generate-diagram.py --type=er --input=docs/specs/04-data-model.md --output=/tmp/er.png
  python3 sdd-generate-diagram.py --type=dependency --input=docs/specs/02-architecture.md --output=/tmp/dep.png
  python3 sdd-generate-diagram.py --type=interaction --input=docs/specs/05-component-breakdown.md --output=/tmp/int.png

지원 유형:
  architecture  - diagrams 라이브러리 (클라우드/온프레미스 아이콘)
  dependency    - graphviz DOT (모듈 의존성)
  er            - graphviz DOT (엔티티 관계)
  interaction   - graphviz DOT (컴포넌트 상호작용)
  domain        - diagrams Cluster (도메인 경계)

출력: JSON { "output": "<path>", "type": "<type>" }
"""

import argparse
import json
import os
import re
import sys
import tempfile


def parse_args():
    parser = argparse.ArgumentParser(description='SDD 다이어그램 생성기')
    parser.add_argument('--type', required=True,
                        choices=['architecture', 'dependency', 'er', 'interaction', 'domain'],
                        help='다이어그램 유형')
    parser.add_argument('--input', required=True, help='마크다운 산출물 경로')
    parser.add_argument('--output', required=True, help='출력 PNG 파일 경로')
    parser.add_argument('--title', default='', help='다이어그램 제목')
    return parser.parse_args()


def read_markdown(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def extract_modules(content):
    """마크다운에서 모듈/컴포넌트 목록을 추출합니다."""
    modules = []
    # ## 또는 ### 헤더에서 모듈명 추출
    for match in re.finditer(r'^#{2,3}\s+(.+?)(?:\s*[-—].*)?$', content, re.MULTILINE):
        name = match.group(1).strip()
        if name and len(name) < 50:
            modules.append(name)
    return modules


def extract_entities(content):
    """마크다운에서 엔티티와 필드를 추출합니다."""
    entities = {}
    current_entity = None

    for line in content.split('\n'):
        # 엔티티 헤더 (### EntityName 또는 ## EntityName)
        entity_match = re.match(r'^#{2,3}\s+(\w+)', line)
        if entity_match:
            name = entity_match.group(1)
            if name[0].isupper():
                current_entity = name
                entities[current_entity] = []

        # 필드 (- fieldName: Type 또는 | fieldName | Type |)
        if current_entity:
            field_match = re.match(r'^\s*[-*]\s+`?(\w+)`?\s*[:\|]\s*(.+)', line)
            if field_match:
                entities[current_entity].append(field_match.group(1))

            table_match = re.match(r'^\|\s*`?(\w+)`?\s*\|', line)
            if table_match and table_match.group(1) not in ('필드', 'Field', '---', 'name', 'Name'):
                entities[current_entity].append(table_match.group(1))

    return entities


def extract_relations(content):
    """마크다운에서 관계(FK, 참조)를 추출합니다."""
    relations = []
    # "A → B" 또는 "A -> B" 패턴
    for match in re.finditer(r'(\w+)\s*(?:→|->|depends on|references)\s*(\w+)', content, re.IGNORECASE):
        relations.append((match.group(1), match.group(2)))
    # FK 패턴: "FK: entity_id → Entity"
    for match in re.finditer(r'FK[:\s]+\w+\s*(?:→|->)\s*(\w+)', content, re.IGNORECASE):
        pass  # already captured above
    return relations


def generate_with_graphviz(diagram_type, content, output_path, title=''):
    """graphviz를 사용하여 다이어그램을 생성합니다."""
    try:
        import graphviz
    except ImportError:
        print(json.dumps({"error": "graphviz Python 패키지가 설치되지 않았습니다. pip3 install graphviz"}))
        sys.exit(1)

    if diagram_type == 'er':
        entities = extract_entities(content)
        relations = extract_relations(content)

        dot = graphviz.Digraph(comment=title or 'ER Diagram', format='png')
        dot.attr(rankdir='LR', bgcolor='white', fontname='Helvetica')
        dot.attr('node', shape='record', fontname='Helvetica', fontsize='10')
        dot.attr('edge', fontname='Helvetica', fontsize='9')

        for entity, fields in entities.items():
            field_str = '|'.join(fields[:10])  # max 10 fields
            label = f'{{{entity}|{field_str}}}'
            dot.node(entity, label=label)

        for src, dst in relations:
            if src in entities and dst in entities:
                dot.edge(src, dst)

    elif diagram_type == 'dependency':
        modules = extract_modules(content)
        relations = extract_relations(content)

        dot = graphviz.Digraph(comment=title or 'Module Dependencies', format='png')
        dot.attr(rankdir='TB', bgcolor='white', fontname='Helvetica')
        dot.attr('node', shape='box', style='rounded,filled', fillcolor='#E8F4FD',
                 fontname='Helvetica', fontsize='11')
        dot.attr('edge', color='#4A90D9', fontname='Helvetica', fontsize='9')

        for mod in modules:
            dot.node(mod)

        for src, dst in relations:
            dot.edge(src, dst)

    elif diagram_type == 'interaction':
        modules = extract_modules(content)
        relations = extract_relations(content)

        dot = graphviz.Digraph(comment=title or 'Component Interaction', format='png')
        dot.attr(rankdir='LR', bgcolor='white', fontname='Helvetica')
        dot.attr('node', shape='component', style='filled', fillcolor='#FFF3E0',
                 fontname='Helvetica', fontsize='11')
        dot.attr('edge', color='#E65100', fontname='Helvetica', fontsize='9')

        for mod in modules:
            dot.node(mod)

        for src, dst in relations:
            dot.edge(src, dst)

    else:
        print(json.dumps({"error": f"graphviz에서 지원하지 않는 유형: {diagram_type}"}))
        sys.exit(1)

    # 확장자 없는 경로로 렌더링 (graphviz가 .png를 자동 추가)
    base_path = output_path.rsplit('.png', 1)[0] if output_path.endswith('.png') else output_path
    dot.render(base_path, cleanup=True)

    # graphviz가 생성한 파일 경로 반환
    actual_path = base_path + '.png' if not output_path.endswith('.png') else output_path
    return actual_path


def generate_with_diagrams(diagram_type, content, output_path, title=''):
    """Python diagrams 라이브러리를 사용하여 다이어그램을 생성합니다."""
    try:
        from diagrams import Diagram, Cluster
    except ImportError:
        print(json.dumps({"error": "diagrams 패키지가 설치되지 않았습니다. pip3 install diagrams"}))
        sys.exit(1)

    modules = extract_modules(content)
    relations = extract_relations(content)

    # 출력 디렉토리 및 파일명 분리
    out_dir = os.path.dirname(output_path) or '.'
    out_name = os.path.basename(output_path).rsplit('.png', 1)[0]

    try:
        from diagrams.generic.blank import Blank
        from diagrams.generic.compute import Rack
    except ImportError:
        # fallback to graphviz
        return generate_with_graphviz(diagram_type, content, output_path, title)

    graph_attr = {"bgcolor": "white", "pad": "0.5"}

    with Diagram(title or "Architecture", show=False, direction="TB",
                 filename=os.path.join(out_dir, out_name),
                 outformat="png", graph_attr=graph_attr):

        nodes = {}
        for mod in modules[:15]:  # max 15 nodes
            nodes[mod] = Rack(mod)

        for src, dst in relations:
            if src in nodes and dst in nodes:
                nodes[src] >> nodes[dst]

    return output_path


def main():
    args = parse_args()

    if not os.path.exists(args.input):
        print(json.dumps({"error": f"입력 파일을 찾을 수 없습니다: {args.input}"}))
        sys.exit(1)

    content = read_markdown(args.input)

    # 도구 선택
    use_diagrams = False
    if args.type in ('architecture', 'domain'):
        try:
            import diagrams
            use_diagrams = True
        except ImportError:
            pass

    try:
        if use_diagrams:
            result_path = generate_with_diagrams(args.type, content, args.output, args.title)
        else:
            result_path = generate_with_graphviz(args.type, content, args.output, args.title)

        print(json.dumps({"output": result_path, "type": args.type}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
