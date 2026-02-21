#!/usr/bin/env python3
"""
Confluence 페이지에 파일을 첨부합니다.

~/.claude.json에서 MCP 서버의 인증 정보를 추출하여
atlassian-python-api로 첨부 파일을 업로드합니다.

사용법:
  python3 sdd-confluence-upload.py \
    --mcp-server=mcp-atlassian-company1 \
    --page-id=332398793 \
    --file=diagram.png

  python3 sdd-confluence-upload.py \
    --mcp-server=mcp-atlassian-company1 \
    --page-id=332398793 \
    --file=arch.png \
    --file=er.png

출력: JSON { "uploaded": [...], "page_id": "..." }
"""

import argparse
import json
import os
import sys


def parse_args():
    parser = argparse.ArgumentParser(description='Confluence 첨부 업로더')
    parser.add_argument('--mcp-server', required=True, help='~/.claude.json의 MCP 서버 이름')
    parser.add_argument('--page-id', required=True, help='Confluence 페이지 ID')
    parser.add_argument('--file', required=True, action='append', help='첨부할 파일 경로 (여러 번 지정 가능)')
    return parser.parse_args()


def load_mcp_config(server_name):
    """~/.claude.json에서 MCP 서버 설정을 읽습니다."""
    claude_json_path = os.path.expanduser('~/.claude.json')
    if not os.path.exists(claude_json_path):
        print(json.dumps({"error": "~/.claude.json을 찾을 수 없습니다"}))
        sys.exit(1)

    with open(claude_json_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    mcp_servers = config.get('mcpServers', {})
    if server_name not in mcp_servers:
        print(json.dumps({"error": f"MCP 서버 '{server_name}'을 찾을 수 없습니다. 설정된 서버: {list(mcp_servers.keys())}"}))
        sys.exit(1)

    return mcp_servers[server_name]


def extract_confluence_credentials(server_config):
    """MCP 서버 설정에서 Confluence 인증 정보를 추출합니다."""
    env = server_config.get('env', {})

    url = env.get('CONFLUENCE_URL', '')
    username = env.get('CONFLUENCE_USERNAME', '')
    api_token = env.get('CONFLUENCE_API_TOKEN', '')
    ssl_verify = env.get('CONFLUENCE_SSL_VERIFY', 'true').lower() != 'false'

    if not url:
        # JIRA_URL에서 추론
        jira_url = env.get('JIRA_URL', '')
        if jira_url:
            url = jira_url.rstrip('/') + '/wiki'

    if not url or not username or not api_token:
        missing = []
        if not url: missing.append('CONFLUENCE_URL')
        if not username: missing.append('CONFLUENCE_USERNAME')
        if not api_token: missing.append('CONFLUENCE_API_TOKEN')
        print(json.dumps({"error": f"MCP 서버에 필요한 환경변수가 없습니다: {', '.join(missing)}"}))
        sys.exit(1)

    return {
        'url': url,
        'username': username,
        'api_token': api_token,
        'ssl_verify': ssl_verify,
    }


def upload_files(credentials, page_id, file_paths):
    """atlassian-python-api를 사용하여 파일을 첨부합니다."""
    try:
        from atlassian import Confluence
    except ImportError:
        print(json.dumps({"error": "atlassian-python-api가 설치되지 않았습니다. pip3 install atlassian-python-api"}))
        sys.exit(1)

    import urllib3
    if not credentials['ssl_verify']:
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    confluence = Confluence(
        url=credentials['url'],
        username=credentials['username'],
        password=credentials['api_token'],
        verify_ssl=credentials['ssl_verify'],
    )

    uploaded = []
    errors = []

    for file_path in file_paths:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": "파일을 찾을 수 없습니다"})
            continue

        try:
            filename = os.path.basename(file_path)
            confluence.attach_file(
                file_path,
                name=filename,
                page_id=page_id,
                comment=f'SDD 다이어그램: {filename}',
            )
            uploaded.append({"file": file_path, "filename": filename})
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return uploaded, errors


def main():
    args = parse_args()

    # MCP 서버 설정 로드
    server_config = load_mcp_config(args.mcp_server)

    # 인증 정보 추출
    credentials = extract_confluence_credentials(server_config)

    # 파일 존재 확인
    for file_path in args.file:
        if not os.path.exists(file_path):
            print(json.dumps({"error": f"파일을 찾을 수 없습니다: {file_path}"}))
            sys.exit(1)

    # 업로드
    uploaded, errors = upload_files(credentials, args.page_id, args.file)

    result = {
        "page_id": args.page_id,
        "uploaded": uploaded,
    }

    if errors:
        result["errors"] = errors

    print(json.dumps(result, ensure_ascii=False))

    if errors and not uploaded:
        sys.exit(1)


if __name__ == '__main__':
    main()
