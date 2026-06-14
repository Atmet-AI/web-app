# Rules
## Repo Creation:
- Each repo should be named in a clear way; for example: Database/ Backend/ Frontend.
- Each repo must have a README.md file that must not be written by AI. You write it or leave it empty.
- If a README.md file exists, it should have a small description about the repo + how to use it or test it.
- Each repo must have a .gitignore file. Pick the right .gitignore file from Github's options for example: python.
- Each repo must have a .env and must be said explicitly in the README.md file how to produce or where to find it.

## Repo Production:
- The main branch is the one you start with. If you want to do any change, DO NOT DO IT ON MAIN BRANCH. Instead, create a new branch, commit your changes and then create a pull request. 
- Branch naming: Each branch naming should have this structure: <dev_name>-<title of change>, for example: doleh-database-change.
- Only an expert/ creator/ admin is allowed to accept the pull request and deleting the branch is up to the one accepting the pull request.
- Each commit must have a clear understandable message. 
- Each commit must represent one change at a time. NOT A WHOLE DAY OR TWO OF WORKING. So, when you change a script to do two different tasks, you must commit them two times seperately.
- After working on the repo or at the end of the day, you must push all your changes to your branch.
- The pull request admin should add the changelog.md.

## Versioning
- Version names are not represented in the name of the repo. It must be present on the README.md.
- The versioning starts with 0.0.0. Once the version is stable and working it should change to 1.0.0. 
- New feature added -> 1.1.0
- Bug fix or a small change -> 1.0.1
- Breaking change -> breaking change.

## Good Practices
- .gitignore must have the .env file.
- Keep API keys, port names, or any secrut stuff in .env file.
- README.md file should explain some tests such that when a developer change something, they must run these tests to make sure all the essential things are working.

## Namings
- Variable names should make sense and not so long and must follow Snake Case (snake_case).
- Folders naming must follow Kebab Case (kebab-case).
- Files naming must follow Camel Case (camelCase).

## Virtual Environment
- Each virtual env **must be named venv**, in the README.md it must explicitly say how to create it using windows/linux/ and mac.
- A requirements.txt file must exist in the root file of the repo.
