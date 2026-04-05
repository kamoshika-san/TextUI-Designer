# 10-diff-preview

## 概要

ビジュアルDiffプレビュー機能のデモンストレーション用サンプルです。

このサンプルでは、簡単なユーザー登録フォームの2つのバージョン（ver1とver2）を用意し、Diffエンジンがどのように変更を検知・表示するかを確認できます。

## ファイル

- `ver1.tui.yml`: フォームの初期バージョン
- `ver2.tui.yml`: フォームの更新バージョン

## 変更内容

ver1 → ver2 の主な変更点:

- ページタイトルの変更（"Version 1" → "Version 2"）
- 説明文の更新
- 新しいフィールドの追加（Phone Number）
- Date of Birthフィールドにrequired属性の追加
- ボタンラベルの変更（"Register" → "Submit Registration"）

## 使い方

1. `ver1.tui.yml` と `ver2.tui.yml` を開く
2. Diffプレビュー機能を使用して2つのファイルを比較（機能が実装されている場合）
3. 変更前後のUI比較を確認

このサンプルは、Diffの各種変更種別（update, addなど）をテストするためのものです。