# Workspace Directory

This directory is mounted as a volume in the Docker container and can be used for:
- File operations by the MCP server
- Temporary storage
- Code generation and editing
- Working files for Claude tools

The workspace is accessible at:
- Host: `./workspace`
- Container: `/app/workspace`

## Usage Examples

### File Operations
- Read files: `/app/workspace/myfile.txt`
- Write files: `/app/workspace/output.txt`
- List files: `/app/workspace/`

### Security Notes
- This directory is accessible within the container
- Ensure proper file permissions
- Clean up sensitive files after use
- This directory is persisted on the host machine