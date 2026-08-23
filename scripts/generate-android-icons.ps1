Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$res = Join-Path $root "android\app\src\main\res"

$sizes = @{
  "mipmap-mdpi" = 48
  "mipmap-hdpi" = 72
  "mipmap-xhdpi" = 96
  "mipmap-xxhdpi" = 144
  "mipmap-xxxhdpi" = 192
}

function New-IconBitmap {
  param(
    [int]$Size,
    [bool]$Round,
    [bool]$Foreground
  )

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $scale = $Size / 128.0
  $pad = if ($Foreground) { 22 * $scale } else { 0 }
  $x = $pad
  $y = $pad
  $w = $Size - ($pad * 2)
  $h = $Size - ($pad * 2)
  $r = if ($Round) { $w / 2 } else { 30 * $scale }

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($Round) {
    $path.AddEllipse($x, $y, $w, $h)
  } else {
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
  }

  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.RectangleF]::new($x, $y, $w, $h),
    [System.Drawing.Color]::FromArgb(255, 15, 143, 104),
    [System.Drawing.Color]::FromArgb(255, 242, 118, 46),
    45
  )
  $g.FillPath($brush, $path)

  $clipState = $g.Save()
  $g.SetClip($path)

  $penCane1 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 247, 214, 107)), (10 * $scale)
  $penCane2 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 199, 233, 90)), (10 * $scale)
  $penStripe = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 248, 207)), (7 * $scale)
  foreach ($pen in @($penCane1, $penCane2, $penStripe)) {
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  }

  $g.DrawLine($penCane1, 33 * $scale + $pad, 29 * $scale + $pad, 77 * $scale + $pad, 101 * $scale + $pad)
  $g.DrawLine($penCane2, 48 * $scale + $pad, 22 * $scale + $pad, 92 * $scale + $pad, 94 * $scale + $pad)
  $g.DrawLine($penStripe, 28 * $scale + $pad, 51 * $scale + $pad, 60 * $scale + $pad, 51 * $scale + $pad)
  $g.DrawLine($penStripe, 42 * $scale + $pad, 75 * $scale + $pad, 75 * $scale + $pad, 75 * $scale + $pad)
  $g.DrawLine($penStripe, 56 * $scale + $pad, 99 * $scale + $pad, 89 * $scale + $pad, 99 * $scale + $pad)

  $cup = New-Object System.Drawing.Drawing2D.GraphicsPath
  $cup.AddPolygon(@(
    [System.Drawing.PointF]::new(39 * $scale + $pad, 55 * $scale + $pad),
    [System.Drawing.PointF]::new(89 * $scale + $pad, 55 * $scale + $pad),
    [System.Drawing.PointF]::new(82 * $scale + $pad, 110 * $scale + $pad),
    [System.Drawing.PointF]::new(46 * $scale + $pad, 110 * $scale + $pad)
  ))
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 255, 253, 242))), $cup)

  $penCup = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(210, 15, 118, 110)), (6 * $scale)
  $penCup.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $penCup.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($penCup, 45 * $scale + $pad, 66 * $scale + $pad, 83 * $scale + $pad, 66 * $scale + $pad)
  $g.DrawLine($penCup, 49 * $scale + $pad, 94 * $scale + $pad, 79 * $scale + $pad, 94 * $scale + $pad)

  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 154, 61))), 77 * $scale + $pad, 25 * $scale + $pad, 26 * $scale, 26 * $scale)
  $leaf = New-Object System.Drawing.Drawing2D.GraphicsPath
  $leaf.AddBezier(
    [System.Drawing.PointF]::new(90 * $scale + $pad, 25 * $scale + $pad),
    [System.Drawing.PointF]::new(93 * $scale + $pad, 16 * $scale + $pad),
    [System.Drawing.PointF]::new(101 * $scale + $pad, 13 * $scale + $pad),
    [System.Drawing.PointF]::new(111 * $scale + $pad, 16 * $scale + $pad)
  )
  $leaf.AddBezier(
    [System.Drawing.PointF]::new(111 * $scale + $pad, 16 * $scale + $pad),
    [System.Drawing.PointF]::new(108 * $scale + $pad, 24 * $scale + $pad),
    [System.Drawing.PointF]::new(101 * $scale + $pad, 29 * $scale + $pad),
    [System.Drawing.PointF]::new(90 * $scale + $pad, 25 * $scale + $pad)
  )
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 181, 223, 73))), $leaf)

  $g.Restore($clipState)
  $g.Dispose()
  return $bmp
}

foreach ($entry in $sizes.GetEnumerator()) {
  $dir = Join-Path $res $entry.Key
  $size = [int]$entry.Value

  $icon = New-IconBitmap -Size $size -Round:$false -Foreground:$false
  $icon.Save((Join-Path $dir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $icon.Dispose()

  $round = New-IconBitmap -Size $size -Round:$true -Foreground:$false
  $round.Save((Join-Path $dir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $round.Dispose()

  $foregroundSize = [int]($size * 2.25)
  $foreground = New-IconBitmap -Size $foregroundSize -Round:$false -Foreground:$true
  $foreground.Save((Join-Path $dir "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $foreground.Dispose()
}

Write-Host "Generated Android launcher icons."
