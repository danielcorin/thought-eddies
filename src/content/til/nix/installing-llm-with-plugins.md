---
title: Using Nix to Install `llm` with Plugins
createdAt: 2024-03-09T16:14:03.000Z
updatedAt: 2024-03-09T16:14:03.000Z
publishedAt: 2024-03-09T16:14:03.000Z
tags:
  - nix
  - llm
  - mistral
draft: false
githubUrl: 'https://github.com/danielcorin/nix-config/pull/2'
---

I use Simon's [`llm`](https://github.com/simonw/) to quickly run LLM prompts.
This package is easily installed with `brew` or `pip`, so if you want to use it, I recommend those approaches.
The following approach is not for the faint of heart and assumes a bit of familiarity with Nix and home-manager.
We are going to install the `llm` including the [`llm-mistral`](https://github.com/simonw/llm-mistral) plugin using Nix.
It's not particularly straightforward, but if you want to manage this tool with Nix, it appears to be _possible_.

Using my [nix-config repo](https://github.com/danielcorin/nix-config/blob/d23d1452c0dbf133f4177b7beea2806a8cc71ea5/home.nix#L25) as a jumping off point, we can easily install `llm` using `home-manager`.
This works because `llm` is available from [nixpkgs](https://github.com/NixOS/nixpkgs/blob/nixos-23.11/pkgs/development/python-modules/llm/default.nix).
You can also find it using the [search](https://search.nixos.org/packages?channel=23.11&from=0&size=50&sort=relevance&type=packages&query=llm).
After rebuilding my system's flake, `llm` is installed and available on the system

```sh
❯ which llm
/etc/profiles/per-user/danielcorin/bin/llm

❯ llm models
OpenAI Chat: gpt-3.5-turbo (aliases: 3.5, chatgpt)
OpenAI Chat: gpt-3.5-turbo-16k (aliases: chatgpt-16k, 3.5-16k)
OpenAI Chat: gpt-4 (aliases: 4, gpt4)
OpenAI Chat: gpt-4-32k (aliases: 4-32k)
OpenAI Chat: gpt-4-1106-preview
OpenAI Chat: gpt-4-0125-preview
OpenAI Chat: gpt-4-turbo-preview (aliases: gpt-4-turbo, 4-turbo, 4t)
OpenAI Completion: gpt-3.5-turbo-instruct (aliases: 3.5-instruct, chatgpt-instruct)
```

So far so good.
If we want to using more than just OpenAI models, we need to install "plugins".
If try and install a plugin as instructed by the [docs](https://llm.datasette.io/en/stable/plugins/installing-plugins.html), we get this error

```sh
❯ llm install llm-mistral
Install command has been disabled for Nix. If you want to install extra llm plugins, use llm.withPlugins([]) expression.
```

At the time of this writing, `llm-mistral` is [not available](https://search.nixos.org/packages?channel=23.11&from=0&size=50&sort=relevance&type=packages&query=llm-mistral) in nixpkgs.
We will need to build it ourselves.
[`nix-init`](https://github.com/nix-community/nix-init) is a helpful tool for generating some of the boiler plate we will need to build a Python package with Nix.
After installing that, we run `nix-init` for `llm-mistral`

```sh
❯ nix-init
Enter url
❯ https://github.com/simonw/llm-mistral
Enter tag or revision (defaults to 0.3)
❯ 0.3
Enter version
❯ 0.3
Enter pname
❯ llm-mistral
How should this package be built?
❯ buildPythonApplication
Enter output path (leave as empty for the current directory)
❯ .
```

I decided to move the outputted `default.nix` into `packages/llm-mistral/default.nix`.
The generated code is pretty close to what we need.
We change `buildPythonApplication` to `buildPythonPackage`, since we want to pass this as a package to `llm.withPlugins`.

```nix
{ lib
, python3
, fetchFromGitHub
}:

python3.pkgs.buildPythonApplication rec {
  pname = "llm-mistral";
  version = "0.3";
  pyproject = true;

  src = fetchFromGitHub {
    owner = "simonw";
    repo = "llm-mistral";
    rev = version;
    hash = "sha256-ddaYXvbee66Keh5loQOs4xuOrtoQ06lHlBWlLiUp2zI=";
  };

  nativeBuildInputs = [
    python3.pkgs.setuptools
    python3.pkgs.wheel
  ];

  propagatedBuildInputs = with python3.pkgs; [
    httpx
    httpx-sse
    llm
  ];

  passthru.optional-dependencies = with python3.pkgs; {
    test = [
      pytest
      pytest-httpx
    ];
  };

  pythonImportsCheck = [ "llm_mistral" ];

  meta = with lib; {
    description = "LLM plugin providing access to Mistral models using the Mistral API";
    homepage = "https://github.com/simonw/llm-mistral";
    license = licenses.asl20;
    maintainers = with maintainers; [ ];
    mainProgram = "llm-mistral";
  };
}
```

We can now include this custom package in `home.nix` (based on how my files are setup) and pass it to `llm.withPlugins([])`

We add

```nix
{ config, pkgs, ... }:
let
    # ...
    llm-mistral = pkgs.callPackage ./packages/llm-mistral/default.nix { };

    systemPackages = with pkgs; [
        # ...
        (llm.withPlugins([llm-mistral]))
        # ...
    ]
# ...
in
{
    # ...
}
```

then run

```sh
darwin-rebuild switch --flake ~/.config/nix/flake.nix
```

We get

```sh
error:
       … while calling the 'derivationStrict' builtin

         at /builtin/derivation.nix:9:12: (source not available)

       … while evaluating derivation 'darwin-system-24.05.20240302.fa9a517+darwin4.daa0360'
         whose name attribute is located at /nix/store/fpr5fsl88azrdsbzjpfq2hk307bbr7cm-source/pkgs/stdenv/generic/make-derivation.nix:353:7

       … while evaluating attribute 'activationScript' of derivation 'darwin-system-24.05.20240302.fa9a517+darwin4.daa0360'

         at /nix/store/69xb0qgirf00jbvamzf2yvgpfv8d0f06-source/modules/system/default.nix:95:7:

           94|
           95|       activationScript = cfg.activationScripts.script.text;
             |       ^
           96|       activationUserScript = cfg.activationScripts.userScript.text;

       (stack trace truncated; use '--show-trace' to show the full trace)

       error: undefined variable 'httpx-sse'

       at /nix/store/fzzgbm0rclhzw163hmiijij5whvamqzb-source/packages/llm-mistral/default.nix:25:5:

           24|     httpx
           25|     httpx-sse
             |     ^
           26|     llm
```

It turns out `httpx-sse` isn't in nixpkgs either.
Following similar steps as above, we using `nix-init`, to build the package ourselves.
Note: any packages dependencies that appear not to be needed by the package at runtime can be moved to `passthru.optional-dependencies` (like `mypy`, `pytest`, `ruff`, `black`, etc.)

We end up needing to build `sse-starlette` as well.
Once we have all of these packages, we can wire them up and pass them into each other as needed.

```nix
{ config, pkgs, ... }:
let
    # ...
    sse-starlette = pkgs.callPackage ./packages/sse-starlette/default.nix { };
    httpx-sse = pkgs.callPackage ./packages/httpx-sse/default.nix { inherit sse-starlette; };
    llm-mistral = pkgs.callPackage ./packages/llm-mistral/default.nix { inherit httpx-sse; };

    systemPackages = with pkgs; [
        # ...
        (llm.withPlugins([llm-mistral]))
        # ...
    ]
# ...
in
{
    # ...
}
```

We also update both `packages/httpx-sse/default.nix` and `packages/llm-mistral/default.nix` to access the locally built packages, so they now have this structure

```nix
{ lib
, python3
, fetchFromGitHub
, httpx-sse
}:

python3.pkgs.buildPythonPackage rec {
  pname = "llm-mistral";
  version = "0.3";
  pyproject = true;

  src = fetchFromGitHub {
    owner = "simonw";
    repo = "llm-mistral";
    rev = version;
    hash = "sha256-ddaYXvbee66Keh5loQOs4xuOrtoQ06lHlBWlLiUp2zI=";
  };

  nativeBuildInputs = [
    python3.pkgs.setuptools
    python3.pkgs.wheel
  ];

  propagatedBuildInputs = [
    python3.pkgs.httpx
    httpx-sse
  ];

  passthru.optional-dependencies = with python3.pkgs; {
    test = [
      pytest
      pytest-httpx
    ];
  };

  pythonImportsCheck = [ "llm_mistral" ];

  meta = with lib; {
    description = "LLM plugin providing access to Mistral models using the Mistral API";
    homepage = "https://github.com/simonw/llm-mistral";
    license = licenses.asl20;
    maintainers = with maintainers; [ ];
  };
}
```

We now get this error

```sh
error: builder for '/nix/store/a0vv7fh9pwf40avbb6z9q4i1c170d874-llm-0.13.1.drv' failed with exit code 1;
       last 10 log lines:
       >   llm 0.13.1 (/nix/store/c8gj1bbmggxyy52ppljh9wlr3zzxwy78-llm-0.13.1)
       >     dependency chain:
       >       this derivation: /nix/store/c8gj1bbmggxyy52ppljh9wlr3zzxwy78-llm-0.13.1
       >   llm 0.13.1 (/nix/store/gna4icldg4vzd0m3v49cn9dp7dls31vl-python3.11-llm-0.13.1)
       >     dependency chain:
       >       this derivation: /nix/store/c8gj1bbmggxyy52ppljh9wlr3zzxwy78-llm-0.13.1
       >       ...depending on: /nix/store/aga00jbi95bj2wpvkc1y76gvl94693ck-python3.11-llm-mistral-0.3
       >       ...depending on: /nix/store/gna4icldg4vzd0m3v49cn9dp7dls31vl-python3.11-llm-0.13.1
       >
       > Package duplicates found in closure, see above. Usually this happens if two packages depend on different version of the same dependency.
       For full logs, run 'nix log /nix/store/a0vv7fh9pwf40avbb6z9q4i1c170d874-llm-0.13.1.drv'.
error: 1 dependencies of derivation '/nix/store/bkg0bcc7dai8cag3anm3k6am1i43h6gy-home-manager-applications.drv' failed to build
error: 1 dependencies of derivation '/nix/store/1q2hdsrr1yn6sy79nbnkkbnrggm8qw61-home-manager-fonts.drv' failed to build
error: 1 dependencies of derivation '/nix/store/c7j1jcjhdbfagpwm8f22np8bz4k6n34c-home-manager-path.drv' failed to build
error: 1 dependencies of derivation '/nix/store/4xsby6g8gcl1nzv7cg4v34q5lccag7g5-home-manager-generation.drv' failed to build
error: 1 dependencies of derivation '/nix/store/zrbpniffpka4f47qq3x3f5ijwndjyj02-user-environment.drv' failed to build
error: 1 dependencies of derivation '/nix/store/84m731za8s233cg1zcyzrh4w97vg0qya-activation-danielcorin.drv' failed to build
error: 1 dependencies of derivation '/nix/store/g9npff23rkspwlwhyh9x8y2jjn0vphzm-darwin-system-24.05.20240302.fa9a517+darwin4.daa0360.drv' failed to build
```

There is a now circular dependency between `llm` and `llm-mistral`.
This can be resolved by removing `llm` as a dependency in the `packages/llm-mistral/default.nix`.
We will rely on it being available at runtime.

```nix
{ lib
, python3
, fetchFromGitHub
}:

python3.pkgs.buildPythonApplication rec {
  pname = "llm-mistral";
  version = "0.3";
  pyproject = true;

  src = fetchFromGitHub {
    owner = "simonw";
    repo = "llm-mistral";
    rev = version;
    hash = "sha256-ddaYXvbee66Keh5loQOs4xuOrtoQ06lHlBWlLiUp2zI=";
  };

  nativeBuildInputs = [
    python3.pkgs.setuptools
    python3.pkgs.wheel
  ];

  propagatedBuildInputs = with python3.pkgs; [
    httpx
    httpx-sse
  ];

  passthru.optional-dependencies = with python3.pkgs; {
    test = [
      pytest
      pytest-httpx
    ];
  };

  pythonImportsCheck = [ "llm_mistral" ];

  meta = with lib; {
    description = "LLM plugin providing access to Mistral models using the Mistral API";
    homepage = "https://github.com/simonw/llm-mistral";
    license = licenses.asl20;
    maintainers = with maintainers; [ ];
    mainProgram = "llm-mistral";
  };
}
```

Rebuilding once more gives us

```sh
error: builder for '/nix/store/fslzva033y3vfrci0q9s4jiaqd63f05c-python3.11-llm-mistral-0.3.drv' failed with exit code 1;
       last 10 log lines:
       > adding 'llm_mistral-0.3.dist-info/top_level.txt'
       > adding 'llm_mistral-0.3.dist-info/RECORD'
       > removing build/bdist.macosx-11.0-arm64/wheel
       > Successfully built llm_mistral-0.3-py3-none-any.whl
       > Finished creating a wheel...
       > Finished executing pypaBuildPhase
       > Running phase: pythonRuntimeDepsCheckHook
       > Executing pythonRuntimeDepsCheck
       > Checking runtime dependencies for llm_mistral-0.3-py3-none-any.whl
       >   - llm not installed
       For full logs, run 'nix log /nix/store/fslzva033y3vfrci0q9s4jiaqd63f05c-python3.11-llm-mistral-0.3.drv'.
error: 1 dependencies of derivation '/nix/store/d9rpk7m2fxm75ig2vgfq56grzfckkavl-llm-0.13.1.drv' failed to build
error: 1 dependencies of derivation '/nix/store/3p9izs6k1f5xi6k7dm2plvkq4psrmn3h-home-manager-applications.drv' failed to build
error: 1 dependencies of derivation '/nix/store/87l7gpfbyj8rzzyx1jx24z43yv0s7abh-home-manager-fonts.drv' failed to build
error: 1 dependencies of derivation '/nix/store/1509dawq87wdipw5wmd12p1cdg3a5shi-home-manager-path.drv' failed to build
error: 1 dependencies of derivation '/nix/store/9ikbbbd401a6103nngwn97ddawjjq1xa-home-manager-generation.drv' failed to build
error: 1 dependencies of derivation '/nix/store/is91dljc99y03j9y7p4xbrfkz5h5w0dx-user-environment.drv' failed to build
error: 1 dependencies of derivation '/nix/store/yw72ya9xffz4xvzddqxpamra1dx2lil5-activation-danielcorin.drv' failed to build
error: 1 dependencies of derivation '/nix/store/y5fyldxp9cp8dil02gzqvw05vflb75in-darwin-system-24.05.20240302.fa9a517+darwin4.daa0360.drv' failed to build
```

We can remove `pythonImportsCheck = [ "llm_mistral" ];` and add `dontCheckRuntimeDeps = true;` to work around this issue.

We run a final

```sh
darwin-rebuild switch --flake ~/.config/nix/flake.nix
```

and it builds without error.
We now have Mistral models available in the `llm` cli.

```sh
❯ llm models
OpenAI Chat: gpt-3.5-turbo (aliases: 3.5, chatgpt)
OpenAI Chat: gpt-3.5-turbo-16k (aliases: chatgpt-16k, 3.5-16k)
OpenAI Chat: gpt-4 (aliases: 4, gpt4)
OpenAI Chat: gpt-4-32k (aliases: 4-32k)
OpenAI Chat: gpt-4-1106-preview
OpenAI Chat: gpt-4-0125-preview
OpenAI Chat: gpt-4-turbo-preview (aliases: gpt-4-turbo, 4-turbo, 4t)
OpenAI Completion: gpt-3.5-turbo-instruct (aliases: 3.5-instruct, chatgpt-instruct)
Mistral: mistral/open-mistral-7b
Mistral: mistral/mistral-tiny-2312
Mistral: mistral/mistral-tiny (aliases: mistral-tiny)
Mistral: mistral/open-mixtral-8x7b
Mistral: mistral/mistral-small-2312
Mistral: mistral/mistral-small (aliases: mistral-small)
Mistral: mistral/mistral-small-2402
Mistral: mistral/mistral-small-latest
Mistral: mistral/mistral-medium-latest
Mistral: mistral/mistral-medium-2312
Mistral: mistral/mistral-medium (aliases: mistral-medium)
Mistral: mistral/mistral-large-latest (aliases: mistral-large)
Mistral: mistral/mistral-large-2402
```

This was a quite challenge for me and I couldn't have done it without the help of user "Max Headroom" on Discord.
They are one of the creators of the [nixified.ai](https://nixified.ai) project.
Thank you so much your help and patience!

After getting `llm-mistral` working, I tried to install the `llm-claude` plugin for `llm` following similar steps.
In doing so, I ran into a new issue I hadn't seen before, that seemed to be with the `anthropic` library tests.

```sh
error: builder for '/nix/store/bpfw9wimbmvjmfc3ppbfa55jm71zxw26-python3.11-anthropic-0.15.0.drv' failed with exit code 1;
       last 10 log lines:
       > DEBUG    anthropic._base_client:_base_client.py:439 Request options: {'method': 'get', 'url': '/foo'}
       > DEBUG    anthropic._base_client:_base_client.py:439 Request options: {'method': 'get', 'url': '/foo'}
       > DEBUG    anthropic._base_client:_base_client.py:439 Request options: {'method': 'get', 'url': '/foo'}
       > =========================== short test summary info ============================
       > FAILED tests/test_client.py::TestAnthropic::test_copy_build_request - AssertionError
       > FAILED tests/test_client.py::TestAsyncAnthropic::test_copy_build_request - AssertionError
       > ERROR tests/test_client.py::TestAsyncAnthropic::test_raw_response - pluggy.PluggyTeardownRaisedWarning: A plugin raised an exception during an ...
       > ERROR tests/test_utils/test_typing.py::test_extract_type_var_generic_subclass_different_ordering_multiple - DeprecationWarning: pytest-asyncio detected an unclosed event loop when tea...
       > =================== 2 failed, 234 passed, 2 errors in 4.82s ====================
       > /nix/store/zzgwc93q7ycxwks9743f0900i1lagc98-stdenv-darwin/setup: line 1587: pop_var_context: head of shell_variables not a function context
       For full logs, run 'nix log /nix/store/bpfw9wimbmvjmfc3ppbfa55jm71zxw26-python3.11-anthropic-0.15.0.drv'.
error: 1 dependencies of derivation '/nix/store/8s1qxy309bcvjnq7dh5m72bgqgd5yk10-python3.11-llm-claude-0.4.0.drv' failed to build
error: 1 dependencies of derivation '/nix/store/xlqadx7v10isr66d5fkc9yfn8g8vck3q-llm-0.13.1.drv' failed to build
error: 1 dependencies of derivation '/nix/store/954ybsbasav3pvrl5fl7akc6avvr9956-home-manager-applications.drv' failed to build
error: 1 dependencies of derivation '/nix/store/fvr0w1pnyfprygbsqgd4jl242w3h7l6d-home-manager-fonts.drv' failed to build
error: 1 dependencies of derivation '/nix/store/bgf33dwanrw6c9dlwbrbrhcdpddxa5xk-home-manager-path.drv' failed to build
error: 1 dependencies of derivation '/nix/store/zdy47ynmlmr8777gyfhklvk62yqwdzsa-home-manager-generation.drv' failed to build
error: 1 dependencies of derivation '/nix/store/lmrks628m5k1a05bqm2imzaf01sk0wnb-user-environment.drv' failed to build
error: 1 dependencies of derivation '/nix/store/xgxw6x9zjxfyxy33nvk5r6l5sbydr96w-activation-danielcorin.drv' failed to build
```

Here is where I decided to stop.
I want to be able to use `llm` with many different plugins so I'll manage it through Homebrew for now.

The code for this post is available as a PR to my config repo [here](https://github.com/danielcorin/nix-config/pull/2).
