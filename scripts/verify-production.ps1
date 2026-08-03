$ErrorActionPreference = "Stop"

$siteOrigin = "https://theriverkeptflowing.com"

Write-Host "`n=== Production Endpoint Verification ==="

$productionChecks = @(
    @{
        Name = "Homepage"
        Url = "$siteOrigin/"
    },
    @{
        Name = "Robots"
        Url = "$siteOrigin/robots.txt"
    },
    @{
        Name = "Sitemap index"
        Url = "$siteOrigin/sitemap-index.xml"
    },
    @{
        Name = "Sitemap routes"
        Url = "$siteOrigin/sitemap-0.xml"
    },
    @{
        Name = "Social preview"
        Url = "$siteOrigin/social-preview.jpg"
    },
    @{
        Name = "River Guides"
        Url = "$siteOrigin/river-guides/"
    },
    @{
        Name = "Auto handbook"
        Url = "$siteOrigin/content/guides/insurance/auto-insurance-handbook/"
    }
)

$productionResults = foreach ($check in $productionChecks) {

    $statusCode = curl.exe `
        -s `
        -o NUL `
        -w "%{http_code}" `
        $check.Url

    [PSCustomObject]@{
        Name = $check.Name
        Status = $statusCode
        Url = $check.Url
    }

}

$productionResults |
    Format-Table -Wrap -AutoSize

$failedEndpoints = $productionResults |
    Where-Object {
        $_.Status -ne "200"
    }

if ($failedEndpoints) {

    Write-Host ""
    Write-Host "FAIL: One or more production endpoints did not return 200."

    $failedEndpoints |
        Format-Table -Wrap -AutoSize

    exit 1

}

Write-Host "PASS: All required production endpoints returned 200."


Write-Host "`n=== Homepage Metadata Verification ==="

$homepage = (
    curl.exe `
        -s `
        "$siteOrigin/"
) -join "`n"

$homepageChecks = @(
    [PSCustomObject]@{
        Check = "Canonical"
        Passed = $homepage.Contains(
            'rel="canonical"'
        )
    },
    [PSCustomObject]@{
        Check = "Open Graph title"
        Passed = $homepage.Contains(
            'property="og:title"'
        )
    },
    [PSCustomObject]@{
        Check = "Open Graph image"
        Passed = $homepage.Contains(
            "$siteOrigin/social-preview.jpg"
        )
    },
    [PSCustomObject]@{
        Check = "Twitter Card"
        Passed = $homepage.Contains(
            'name="twitter:card"'
        )
    },
    [PSCustomObject]@{
        Check = "WebSite schema"
        Passed = $homepage.Contains(
            '"@type":"WebSite"'
        )
    }
)

$homepageChecks |
    Format-Table -AutoSize

$failedHomepageChecks = $homepageChecks |
    Where-Object {
        -not $_.Passed
    }

if ($failedHomepageChecks) {

    Write-Host ""
    Write-Host "FAIL: Homepage metadata verification failed."

    $failedHomepageChecks |
        Format-Table -AutoSize

    exit 1

}

Write-Host "PASS: Homepage metadata is present."


Write-Host "`n=== Guide Schema Verification ==="

$guide = (
    curl.exe `
        -s `
        "$siteOrigin/content/guides/insurance/auto-insurance-handbook/"
) -join "`n"

$guideChecks = @(
    [PSCustomObject]@{
        Check = "Article schema"
        Passed = $guide.Contains(
            '"@type":"Article"'
        )
    },
    [PSCustomObject]@{
        Check = "Breadcrumb schema"
        Passed = $guide.Contains(
            '"@type":"BreadcrumbList"'
        )
    },
    [PSCustomObject]@{
        Check = "Home breadcrumb"
        Passed = $guide.Contains(
            '"name":"Home"'
        )
    },
    [PSCustomObject]@{
        Check = "River Guides breadcrumb"
        Passed = $guide.Contains(
            '"name":"River Guides"'
        )
    }
)

$guideChecks |
    Format-Table -AutoSize

$failedGuideChecks = $guideChecks |
    Where-Object {
        -not $_.Passed
    }

if ($failedGuideChecks) {

    Write-Host ""
    Write-Host "FAIL: Guide schema verification failed."

    $failedGuideChecks |
        Format-Table -AutoSize

    exit 1

}

Write-Host "PASS: Guide structured data is present."


Write-Host "`n=== Sitemap URL Count ==="

$sitemap = (
    curl.exe `
        -s `
        "$siteOrigin/sitemap-0.xml"
) -join "`n"

$urlCount = (
    [regex]::Matches(
        $sitemap,
        "<loc>"
    )
).Count

Write-Host "Live sitemap URLs: $urlCount"

if ($urlCount -lt 27) {

    Write-Host "FAIL: Sitemap contains fewer than 27 URLs."

    exit 1

}

Write-Host "PASS: Sitemap contains at least 27 URLs."


Write-Host "`n=== Production Verification Complete ==="

exit 0