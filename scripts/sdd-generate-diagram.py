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
    """마크다운에서 모듈/컴포넌트 목록을 추출합니다.

    "모듈 책임", "도메인 내부 모듈 상세", "컴포넌트" 섹션의 ### 헤더만 추출합니다.
    괄호 설명(예: "device (단말기 도메인)" → "device")은 제거합니다.
    """
    modules = []
    in_module_section = False

    for line in content.split('\n'):
        # "모듈 책임", "도메인 내부 모듈 상세", "컴포넌트" 섹션 시작 감지
        if re.match(r'^##\s+(모듈\s*책임|도메인\s*내부\s*모듈\s*상세|컴포넌트)', line):
            in_module_section = True
            continue

        # 다른 ## 섹션이 나오면 모듈 섹션 종료
        if re.match(r'^##\s+', line) and in_module_section:
            in_module_section = False
            continue

        # 모듈 섹션 내의 ### 헤더에서 모듈명 추출
        if in_module_section:
            mod_match = re.match(r'^###\s+(.+)', line)
            if mod_match:
                name = mod_match.group(1).strip()
                # 괄호 설명 제거: "device (단말기 도메인)" → "device"
                name = re.sub(r'\s*\(.*?\)\s*$', '', name)
                # 마크다운 스타일링 제거
                name = name.strip('`*_ ')
                if name and len(name) < 50:
                    modules.append(name)

    return modules


def extract_entities(content):
    """마크다운에서 엔티티와 필드를 추출합니다.

    "엔티티" 섹션 내의 ### 헤더(대문자 시작)를 엔티티로 인식합니다.
    "관계" 테이블에서 ER 관계도 추출합니다.
    """
    entities = {}
    current_entity = None
    in_entity_section = False

    for line in content.split('\n'):
        # "엔티티" 섹션 시작 감지
        if re.match(r'^##\s+엔티티', line):
            in_entity_section = True
            continue

        # "열거형", "마이그레이션" 등 다른 ## 섹션이 나오면 엔티티 섹션 종료
        if re.match(r'^##\s+', line) and in_entity_section:
            in_entity_section = False
            current_entity = None
            continue

        if not in_entity_section:
            continue

        # 엔티티 헤더 (### EntityName)
        entity_match = re.match(r'^###\s+`?(\w+)`?', line)
        if entity_match:
            name = entity_match.group(1)
            if name[0].isupper():
                current_entity = name
                entities[current_entity] = []
            continue

        # 필드 추출 (테이블 형식: | fieldName | Type | ... |)
        if current_entity:
            table_match = re.match(r'^\|\s*`?(\w+)`?\s*\|', line)
            if table_match:
                field_name = table_match.group(1)
                # 테이블 헤더, 구분선, 메타 키워드 제외
                if field_name not in ('필드', 'Field', '---', 'name', 'Name', '이름',
                                      '관계', '인덱스', 'Index', '값', 'Value'):
                    entities[current_entity].append(field_name)

    return entities


def extract_relations(content):
    """마크다운에서 관계(FK, 참조)를 추출합니다.

    두 가지 패턴을 지원합니다:
    1. "**의존성**: moduleA (설명), moduleB (설명)" 패턴 (모듈 책임 섹션)
    2. "A → B" 또는 "A -> B" 화살표 패턴 (fallback)
    3. "관계" 테이블의 대상 컬럼에서 ER 관계 추출
    """
    relations = []
    seen = set()

    def add_relation(src, dst):
        key = (src, dst)
        if key not in seen:
            seen.add(key)
            relations.append(key)

    # 패턴 1: "모듈 책임" / "도메인 내부 모듈 상세" 섹션에서 ### module → **의존성**: targets 파싱
    in_module_section = False
    current_module = None

    for line in content.split('\n'):
        if re.match(r'^##\s+(모듈\s*책임|도메인\s*내부\s*모듈\s*상세|컴포넌트)', line):
            in_module_section = True
            continue
        if re.match(r'^##\s+', line) and in_module_section:
            in_module_section = False
            current_module = None
            continue

        if in_module_section:
            mod_match = re.match(r'^###\s+(.+)', line)
            if mod_match:
                name = mod_match.group(1).strip()
                name = re.sub(r'\s*\(.*?\)\s*$', '', name)
                current_module = name.strip('`*_ ')
                continue

            if current_module:
                dep_match = re.match(r'^\s*-\s+\*\*의존성\*\*\s*:\s*(.+)', line)
                if dep_match:
                    deps_str = dep_match.group(1).strip()
                    if deps_str.lower() in ('없음', 'none', '—', '-', ''):
                        continue
                    # "moduleA (설명), moduleB (설명)" 또는 "moduleA, moduleB"
                    for dep in re.split(r',\s*', deps_str):
                        dep_name = re.sub(r'\s*\(.*?\)', '', dep).strip('`*_ ')
                        if dep_name and dep_name.lower() not in ('없음', 'none', '—', '-'):
                            add_relation(current_module, dep_name)

    # 패턴 2: "관계" 테이블에서 ER 관계 추출 (| 관계 | 대상 | 타입 | FK | 삭제 시 |)
    current_entity = None
    in_relation_table = False

    for line in content.split('\n'):
        entity_match = re.match(r'^###\s+`?(\w+)`?', line)
        if entity_match:
            name = entity_match.group(1)
            if name[0].isupper():
                current_entity = name
                in_relation_table = False
            continue

        if current_entity and re.match(r'^\|\s*관계\s*\|\s*대상\s*\|', line):
            in_relation_table = True
            continue

        if in_relation_table and current_entity:
            if re.match(r'^\|\s*[-:]+\s*\|', line):
                continue
            rel_match = re.match(r'^\|\s*[^|]+\|\s*`?(\w+)`?\s*\|', line)
            if rel_match:
                target = rel_match.group(1).strip()
                if target and target not in ('대상', '---'):
                    add_relation(current_entity, target)
            elif not line.startswith('|'):
                in_relation_table = False

    # 패턴 3: 화살표 패턴 (fallback)
    for match in re.finditer(r'(\w+)\s*(?:→|->)\s*(\w+)', content):
        add_relation(match.group(1), match.group(2))

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
