param(
    [string]$Command = "search",

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
)

$Query = $Arguments -join " "

$Files = Get-ChildItem ./src -Recurse -File `
-Include *.astro,*.css,*.ts,*.js,*.json,*.md,*.mdx

switch ($Command.ToLower()) {

    "search" {

        $Files |
        Select-String $Query |
        ForEach-Object {

            Write-Host ""
            Write-Host $_.Path -ForegroundColor Cyan
            Write-Host ("Line " + $_.LineNumber) -ForegroundColor Yellow
            Write-Host $_.Line

        }

    }

    "stats" {

        Write-Host ""

        Write-Host "Astro files:" `
            ($Files | Where Extension -eq ".astro").Count

        Write-Host "CSS files:" `
            ($Files | Where Extension -eq ".css").Count

        Write-Host "TS files:" `
            ($Files | Where Extension -eq ".ts").Count

        Write-Host "JS files:" `
            ($Files | Where Extension -eq ".js").Count

        Write-Host ""

    }

    default {

        Write-Host ""
        Write-Host "River CLI"
        Write-Host ""

        Write-Host "Commands:"
        Write-Host " search"
        Write-Host " stats"

    }

}