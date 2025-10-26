# Generate PR Description

Generate a standardized pull request description following the SeatKit template format.

## Usage

```
/generate-pr [brief description of changes]
```

## Examples

```
/generate-pr Add database test separation
/generate-pr Fix authentication bug
/generate-pr Implement user profile management
```

## Implementation

Analyze recent git changes and generate a PR description with the following sections:

### Template Structure

1. **Description** - Brief overview + Key Changes as bullet points
2. **Expected Impact** - Positive impacts + Potential Risks
3. **Testing Strategy** - How tested + How contributors can test (with bash code blocks)
4. **Additional Work** - Before Merging + After Merging items

### Key Requirements

- Use plain markdown (no emojis, no checkbox syntax)
- Include bash code blocks for contributor testing instructions
- Keep impacts concise and practical
- Focus on actionable testing steps
- Use bullet points for key changes and impacts
- Use numbered lists for testing procedures

### Sample Output Format

````markdown
## Description

[Brief description of the changes and why they were made]

**Key Changes:**

- [Specific change 1]
- [Specific change 2]
- [Specific change 3]

## Expected Impact

**Positive:**

- [Benefit 1]
- [Benefit 2]

**Potential Risks:**

- [Risk 1]
- [Risk 2]

## Testing Strategy

**How this was tested:**

1. [Testing step 1]
2. [Testing step 2]
3. [Testing step 3]

**How contributors can test:**

```bash
# depends on the nature of the changes
```

## Additional Work (if needed)

### Before Merging (if needed)

- [Pre-merge task 1]
- [Pre-merge task 2]

### After Merging (if needed)

- [Post-merge task 1]
- [Post-merge task 2]

```

## Command Logic

1. **Analyze Git Changes**: Use `git diff --name-only HEAD~1..HEAD` to identify changed files
2. **Determine Change Type**: Based on file patterns (API changes, schema updates, new features, etc.)
3. **Generate Key Changes**: Extract meaningful changes from git log and file diffs
4. **Create Testing Instructions**: Generate relevant testing commands based on changed areas
5. **Suggest Before/After Tasks**: Include common items like "All tests passing" and follow-up work

## Notes

- The command should be concise but comprehensive
- Focus on practical information that helps reviewers and contributors
- Adapt testing instructions based on the type of changes detected
- Include environment-specific commands when relevant (test vs development)
- No emojis
```
````
