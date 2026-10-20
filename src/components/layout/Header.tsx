export default function Header() {
    return (
        <header className="flex items-center justify-between">
            <div className="flex items-center">
                <img
                    src={`${import.meta.env.BASE_URL}assets/logo.png`}
                    alt="Playtest64 logo"
                    className="w-[50px]"
                />
                <h1 className="ml-2 text-2xl">Playtest64</h1>
            </div>
        </header>
    );
}
